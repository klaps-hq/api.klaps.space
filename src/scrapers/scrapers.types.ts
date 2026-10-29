import type {
  ScraperRunProgress,
  ScraperRunStage,
  ScraperRunStats,
} from '../database/schemas/scraper_runs.schema';

export const SCRAPER_KINDS = ['source', 'ticketing', 'enrichment'] as const;
export const RUN_STATUSES = [
  'running',
  'success',
  'partial',
  'failed',
  'cancelled',
] as const;
export const RUN_TRIGGERS = ['cron', 'manual'] as const;
export const LOG_LEVELS = ['info', 'warn', 'error'] as const;

export type ScraperKind = (typeof SCRAPER_KINDS)[number];
export type RunStatus = (typeof RUN_STATUSES)[number];
export type RunTrigger = (typeof RUN_TRIGGERS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];
export type ScraperStatus =
  | 'idle'
  | 'running'
  | 'queued'
  | 'failed'
  | 'disabled';

export interface ScraperRunResponse {
  id: string;
  scraperId: string;
  status: RunStatus;
  trigger: RunTrigger;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  stats: ScraperRunStats;
  stages: ScraperRunStage[];
  progress: ScraperRunProgress | null;
  error: string | null;
  stopRequested: boolean;
}

export interface ScraperSummaryResponse {
  id: string;
  name: string;
  kind: ScraperKind;
  description: string;
  enabled: boolean;
  status: ScraperStatus;
  schedule: string | null;
  nextRunAt: string | null;
  runRequestedAt: string | null;
  lastHeartbeatAt: string | null;
  currentRun: ScraperRunResponse | null;
  lastRun: ScraperRunResponse | null;
}

export interface ScraperLogLineResponse {
  ts: string;
  level: LogLevel;
  stage: string | null;
  message: string;
}

/** Commands handed to the scraper on every heartbeat. */
export interface ScraperHeartbeatResponse {
  enabled: boolean;
  runRequested: boolean;
  stopRequested: boolean;
}
