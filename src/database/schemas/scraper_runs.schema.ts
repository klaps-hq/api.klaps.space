import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { scrapersTable } from './scrapers.schema';

export interface ScraperRunStats {
  fetched: number;
  saved: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface ScraperRunStage {
  name: string;
  status: string;
  durationMs: number | null;
  stats: Partial<ScraperRunStats>;
}

export interface ScraperRunProgress {
  stage: string;
  done: number;
  total: number;
}

// One execution of a scraper. Created by the scraper when a run starts and
// patched as stages complete; stats and stages are reported as a whole.
export const scraperRunsTable = pgTable(
  'scraper_runs',
  {
    id: uuid().primaryKey().defaultRandom(),
    scraperId: varchar({ length: 50 })
      .notNull()
      .references(() => scrapersTable.id, { onDelete: 'cascade' }),
    // 'running' | 'success' | 'partial' | 'failed' | 'cancelled'
    status: varchar({ length: 20 }).notNull().default('running'),
    // 'cron' | 'manual'
    trigger: varchar({ length: 20 }).notNull().default('cron'),
    startedAt: timestamp().notNull().defaultNow(),
    finishedAt: timestamp(),
    durationMs: integer(),
    stats: jsonb()
      .$type<ScraperRunStats>()
      .notNull()
      .default({ fetched: 0, saved: 0, updated: 0, skipped: 0, failed: 0 }),
    stages: jsonb().$type<ScraperRunStage[]>().notNull().default([]),
    progress: jsonb().$type<ScraperRunProgress | null>(),
    error: text(),
    // Set by the panel; the scraper stops cooperatively between stages.
    stopRequested: boolean().notNull().default(false),
  },
  (table) => [
    index('scraper_runs_scraper_started_idx').on(
      table.scraperId,
      table.startedAt,
    ),
  ],
);

export type ScraperRunRow = typeof scraperRunsTable.$inferSelect;
export type NewScraperRunRow = typeof scraperRunsTable.$inferInsert;
