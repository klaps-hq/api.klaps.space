import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { scraperRunsTable } from './scraper_runs.schema';

// Log lines of a scraper run, pushed in batches. Pruned together with old
// runs (see ScrapersRepository.pruneOldRuns).
export const scraperLogsTable = pgTable(
  'scraper_logs',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    runId: uuid()
      .notNull()
      .references(() => scraperRunsTable.id, { onDelete: 'cascade' }),
    ts: timestamp().notNull(),
    // 'info' | 'warn' | 'error'
    level: varchar({ length: 10 }).notNull(),
    stage: varchar({ length: 100 }),
    message: text().notNull(),
  },
  (table) => [index('scraper_logs_run_ts_idx').on(table.runId, table.ts)],
);

export type ScraperLogRow = typeof scraperLogsTable.$inferSelect;
export type NewScraperLogRow = typeof scraperLogsTable.$inferInsert;
