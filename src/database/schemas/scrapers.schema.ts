import {
  boolean,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

// Registry of scrapers. Each scraper process upserts its own row on startup
// (PUT /scrapers/:id) and polls POST /scrapers/:id/heartbeat for commands.
// `enabled` and `runRequestedAt` are owned by the admin panel.
export const scrapersTable = pgTable('scrapers', {
  id: varchar({ length: 50 }).primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  // 'source' | 'ticketing' | 'enrichment'
  kind: varchar({ length: 20 }).notNull().default('source'),
  description: text().notNull().default(''),
  enabled: boolean().notNull().default(true),
  // Cron expression, null when the scraper only runs on demand.
  schedule: varchar({ length: 100 }),
  nextRunAt: timestamp(),
  // Set by the panel ("run now"), cleared when the scraper starts a run.
  runRequestedAt: timestamp(),
  lastHeartbeatAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Scraper = typeof scrapersTable.$inferSelect;
export type NewScraper = typeof scrapersTable.$inferInsert;
