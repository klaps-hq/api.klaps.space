import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, asc, desc, eq, inArray, lt, ne } from 'drizzle-orm';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type { NewScraper, Scraper } from '../database/schemas/scrapers.schema';
import type {
  NewScraperRunRow,
  ScraperRunRow,
} from '../database/schemas/scraper_runs.schema';
import type { NewScraperLogRow } from '../database/schemas/scraper_logs.schema';

type FullSchema = typeof schema & typeof relations;

// Runs (and their logs, via cascade) older than this are pruned when a new
// run starts, so the tables stay small without a separate cleanup job.
const RUN_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class ScrapersRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  // === READ ===

  findAllScrapers(): Promise<Scraper[]> {
    return this.db.query.scrapers.findMany({
      orderBy: asc(schema.scrapers.createdAt),
    });
  }

  findScraperById(id: string): Promise<Scraper | undefined> {
    return this.db.query.scrapers.findFirst({
      where: eq(schema.scrapers.id, id),
    });
  }

  findRuns(params: {
    scraperId?: string;
    limit: number;
  }): Promise<ScraperRunRow[]> {
    return this.db.query.scraper_runs.findMany({
      where: params.scraperId
        ? eq(schema.scraper_runs.scraperId, params.scraperId)
        : undefined,
      orderBy: desc(schema.scraper_runs.startedAt),
      limit: params.limit,
    });
  }

  findRunById(id: string): Promise<ScraperRunRow | undefined> {
    return this.db.query.scraper_runs.findFirst({
      where: eq(schema.scraper_runs.id, id),
    });
  }

  findRunningRun(scraperId: string): Promise<ScraperRunRow | undefined> {
    return this.db.query.scraper_runs.findFirst({
      where: and(
        eq(schema.scraper_runs.scraperId, scraperId),
        eq(schema.scraper_runs.status, 'running'),
      ),
      orderBy: desc(schema.scraper_runs.startedAt),
    });
  }

  findLastFinishedRun(scraperId: string): Promise<ScraperRunRow | undefined> {
    return this.db.query.scraper_runs.findFirst({
      where: and(
        eq(schema.scraper_runs.scraperId, scraperId),
        ne(schema.scraper_runs.status, 'running'),
      ),
      orderBy: desc(schema.scraper_runs.startedAt),
    });
  }

  findLogs(runId: string, levels?: string[]) {
    return this.db.query.scraper_logs.findMany({
      where: and(
        eq(schema.scraper_logs.runId, runId),
        levels ? inArray(schema.scraper_logs.level, levels) : undefined,
      ),
      orderBy: [asc(schema.scraper_logs.ts), asc(schema.scraper_logs.id)],
      limit: 5000,
    });
  }

  // === WRITE ===

  async upsertScraper(
    values: Omit<NewScraper, 'enabled' | 'runRequestedAt' | 'createdAt'>,
  ): Promise<Scraper> {
    // `enabled` and `runRequestedAt` belong to the panel - never overwritten
    // by the scraper re-registering itself on every startup.
    const [row] = await this.db
      .insert(schema.scrapers)
      .values(values)
      .onConflictDoUpdate({
        target: schema.scrapers.id,
        set: {
          name: values.name,
          kind: values.kind,
          description: values.description,
          schedule: values.schedule,
          nextRunAt: values.nextRunAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async updateScraper(
    id: string,
    set: Partial<NewScraper>,
  ): Promise<Scraper | undefined> {
    const [row] = await this.db
      .update(schema.scrapers)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(schema.scrapers.id, id))
      .returning();
    return row;
  }

  async insertRun(values: NewScraperRunRow): Promise<ScraperRunRow> {
    const [row] = await this.db
      .insert(schema.scraper_runs)
      .values(values)
      .returning();
    return row;
  }

  async updateRun(
    id: string,
    set: Partial<NewScraperRunRow>,
  ): Promise<ScraperRunRow | undefined> {
    const [row] = await this.db
      .update(schema.scraper_runs)
      .set(set)
      .where(eq(schema.scraper_runs.id, id))
      .returning();
    return row;
  }

  async insertLogs(rows: NewScraperLogRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db.insert(schema.scraper_logs).values(rows);
  }

  async pruneOldRuns(): Promise<void> {
    await this.db
      .delete(schema.scraper_runs)
      .where(
        lt(
          schema.scraper_runs.startedAt,
          new Date(Date.now() - RUN_RETENTION_MS),
        ),
      );
  }
}
