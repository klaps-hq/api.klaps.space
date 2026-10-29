import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Scraper } from '../database/schemas/scrapers.schema';
import type { ScraperRunRow } from '../database/schemas/scraper_runs.schema';
import { ScrapersRepository } from './scrapers.repository';
import type {
  AppendLogsDto,
  HeartbeatDto,
  RegisterScraperDto,
  StartRunDto,
  UpdateRunDto,
} from './dto/scraper.dto';
import type {
  LogLevel,
  RunStatus,
  RunTrigger,
  ScraperHeartbeatResponse,
  ScraperKind,
  ScraperLogLineResponse,
  ScraperRunResponse,
  ScraperStatus,
  ScraperSummaryResponse,
} from './scrapers.types';

// A running run whose scraper stopped sending heartbeats for this long is
// considered dead (process crashed or was redeployed mid-run).
const STALE_HEARTBEAT_MS = 15 * 60 * 1000;
const DEFAULT_RUNS_LIMIT = 50;

const iso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

export const toRunResponse = (row: ScraperRunRow): ScraperRunResponse => ({
  id: row.id,
  scraperId: row.scraperId,
  status: row.status as RunStatus,
  trigger: row.trigger as RunTrigger,
  startedAt: row.startedAt.toISOString(),
  finishedAt: iso(row.finishedAt),
  durationMs: row.durationMs,
  stats: row.stats,
  stages: row.stages,
  progress: row.progress ?? null,
  error: row.error,
  stopRequested: row.stopRequested,
});

const deriveStatus = (
  scraper: Scraper,
  current: ScraperRunRow | undefined,
  last: ScraperRunRow | undefined,
): ScraperStatus => {
  if (!scraper.enabled) return 'disabled';
  if (current) return 'running';
  if (scraper.runRequestedAt) return 'queued';
  if (last?.status === 'failed') return 'failed';
  return 'idle';
};

@Injectable()
export class ScrapersService {
  constructor(private readonly repository: ScrapersRepository) {}

  // === Panel (read) ===

  async getScrapers(): Promise<ScraperSummaryResponse[]> {
    const scrapers = await this.repository.findAllScrapers();
    return Promise.all(scrapers.map((s) => this.toSummary(s)));
  }

  async getRuns(params: {
    scraperId?: string;
    limit?: number;
  }): Promise<ScraperRunResponse[]> {
    const rows = await this.repository.findRuns({
      scraperId: params.scraperId,
      limit: params.limit ?? DEFAULT_RUNS_LIMIT,
    });
    return rows.map(toRunResponse);
  }

  async getRun(id: string): Promise<ScraperRunResponse> {
    return toRunResponse(await this.requireRun(id));
  }

  async getLogs(
    runId: string,
    level?: LogLevel,
  ): Promise<ScraperLogLineResponse[]> {
    await this.requireRun(runId);
    const rows = await this.repository.findLogs(
      runId,
      level ? [level] : undefined,
    );
    return rows.map((r) => ({
      ts: r.ts.toISOString(),
      level: r.level as LogLevel,
      stage: r.stage,
      message: r.message,
    }));
  }

  // === Panel (actions) ===

  async setEnabled(
    id: string,
    enabled: boolean,
  ): Promise<ScraperSummaryResponse> {
    await this.requireScraper(id);
    const updated = await this.repository.updateScraper(id, {
      enabled,
      // Disabling also drops a pending "run now" request.
      ...(enabled ? {} : { runRequestedAt: null }),
    });
    return this.toSummary(updated!);
  }

  async requestRun(id: string): Promise<{ queued: true }> {
    const scraper = await this.requireScraper(id);
    if (!scraper.enabled) {
      throw new ConflictException(`Scraper "${id}" is disabled`);
    }
    if (await this.repository.findRunningRun(id)) {
      throw new ConflictException(`Scraper "${id}" is already running`);
    }
    await this.repository.updateScraper(id, { runRequestedAt: new Date() });
    return { queued: true };
  }

  async requestStop(id: string): Promise<void> {
    await this.requireScraper(id);
    const run = await this.repository.findRunningRun(id);
    if (!run) {
      throw new ConflictException(`Scraper "${id}" is not running`);
    }
    await this.repository.updateRun(run.id, { stopRequested: true });
  }

  // === Scraper (ingest) ===

  async register(
    id: string,
    dto: RegisterScraperDto,
  ): Promise<ScraperSummaryResponse> {
    const row = await this.repository.upsertScraper({
      id,
      name: dto.name,
      kind: dto.kind,
      description: dto.description ?? '',
      schedule: dto.schedule ?? null,
      nextRunAt: dto.nextRunAt ? new Date(dto.nextRunAt) : null,
      lastHeartbeatAt: new Date(),
    });
    return this.toSummary(row);
  }

  async heartbeat(
    id: string,
    dto: HeartbeatDto,
  ): Promise<ScraperHeartbeatResponse> {
    await this.requireScraper(id);
    const scraper = await this.repository.updateScraper(id, {
      lastHeartbeatAt: new Date(),
      ...(dto.nextRunAt !== undefined
        ? { nextRunAt: dto.nextRunAt ? new Date(dto.nextRunAt) : null }
        : {}),
    });
    const running = await this.repository.findRunningRun(id);
    return {
      enabled: scraper!.enabled,
      runRequested: scraper!.enabled && !!scraper!.runRequestedAt && !running,
      stopRequested: running?.stopRequested ?? false,
    };
  }

  async startRun(id: string, dto: StartRunDto): Promise<ScraperRunResponse> {
    await this.requireScraper(id);
    await this.repository.pruneOldRuns();

    // A previous run still marked as running never reported its end
    // (crash, redeploy) - close it so only one run is "current".
    const orphan = await this.repository.findRunningRun(id);
    if (orphan) {
      await this.finish(orphan, 'failed', 'Interrupted: a new run started.');
    }

    const run = await this.repository.insertRun({
      scraperId: id,
      trigger: dto.trigger ?? 'cron',
      status: 'running',
    });
    await this.repository.updateScraper(id, {
      runRequestedAt: null,
      lastHeartbeatAt: new Date(),
    });
    return toRunResponse(run);
  }

  async updateRun(id: string, dto: UpdateRunDto): Promise<ScraperRunResponse> {
    const run = await this.requireRun(id);
    const terminal = dto.status && dto.status !== 'running';
    const now = new Date();
    const updated = await this.repository.updateRun(id, {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.stats ? { stats: dto.stats } : {}),
      ...(dto.stages ? { stages: dto.stages } : {}),
      ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
      ...(dto.error !== undefined ? { error: dto.error } : {}),
      ...(terminal && !run.finishedAt
        ? {
            finishedAt: now,
            durationMs: now.getTime() - run.startedAt.getTime(),
            progress: null,
          }
        : {}),
    });
    return toRunResponse(updated!);
  }

  async appendLogs(runId: string, dto: AppendLogsDto): Promise<void> {
    await this.requireRun(runId);
    await this.repository.insertLogs(
      dto.lines.map((l) => ({
        runId,
        ts: new Date(l.ts),
        level: l.level,
        stage: l.stage ?? null,
        message: l.message,
      })),
    );
  }

  // === helpers ===

  private async toSummary(scraper: Scraper): Promise<ScraperSummaryResponse> {
    let current = await this.repository.findRunningRun(scraper.id);
    const heartbeat = scraper.lastHeartbeatAt?.getTime() ?? 0;
    if (current && Date.now() - heartbeat > STALE_HEARTBEAT_MS) {
      await this.finish(current, 'failed', 'Scraper stopped responding.');
      current = undefined;
    }
    const last = await this.repository.findLastFinishedRun(scraper.id);

    return {
      id: scraper.id,
      name: scraper.name,
      kind: scraper.kind as ScraperKind,
      description: scraper.description,
      enabled: scraper.enabled,
      status: deriveStatus(scraper, current, last),
      schedule: scraper.schedule,
      nextRunAt: iso(scraper.nextRunAt),
      runRequestedAt: iso(scraper.runRequestedAt),
      lastHeartbeatAt: iso(scraper.lastHeartbeatAt),
      currentRun: current ? toRunResponse(current) : null,
      lastRun: last ? toRunResponse(last) : null,
    };
  }

  private async finish(
    run: ScraperRunRow,
    status: RunStatus,
    error: string,
  ): Promise<void> {
    const now = new Date();
    await this.repository.updateRun(run.id, {
      status,
      error,
      finishedAt: now,
      durationMs: now.getTime() - run.startedAt.getTime(),
      progress: null,
    });
  }

  private async requireScraper(id: string): Promise<Scraper> {
    const scraper = await this.repository.findScraperById(id);
    if (!scraper) throw new NotFoundException(`Scraper "${id}" not found`);
    return scraper;
  }

  private async requireRun(id: string): Promise<ScraperRunRow> {
    const run = await this.repository.findRunById(id);
    if (!run) throw new NotFoundException(`Run "${id}" not found`);
    return run;
  }
}
