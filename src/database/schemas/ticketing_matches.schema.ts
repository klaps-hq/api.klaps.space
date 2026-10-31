import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

// The ticketing scraper's film matches, keyed by "provider:externalFilmId".
// Kept here instead of a file in the container so a match survives deploys
// and a manual correction from the panel applies to every later run.
export const ticketingMatchesTable = pgTable('ticketing_matches', {
  key: varchar({ length: 500 }).primaryKey(),
  provider: varchar({ length: 50 }).notNull(),
  rawTitle: varchar({ length: 500 }).notNull(),
  // 'matched' | 'event' | 'not-film' | 'unresolved'
  status: varchar({ length: 20 }).notNull(),
  filmwebId: integer(),
  title: varchar({ length: 500 }),
  year: integer(),
  method: varchar({ length: 30 }),
  confidence: real(),
  note: text(),
  // The scraper's full MatchResult (candidates, event films).
  result: jsonb().$type<Record<string, unknown>>().notNull(),
  // Set from the panel: the scraper never overwrites a manual row.
  manual: boolean().notNull().default(false),
  reviewedAt: timestamp(),
  // Filmweb cinema ids and screening count from the latest run.
  cinemas: jsonb().$type<number[]>().notNull().default([]),
  screenings: integer().notNull().default(0),
  checkedAt: timestamp().notNull().defaultNow(),
  lastSeenAt: timestamp().notNull().defaultNow(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type TicketingMatchRow = typeof ticketingMatchesTable.$inferSelect;
export type NewTicketingMatchRow = typeof ticketingMatchesTable.$inferInsert;
