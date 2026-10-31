import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const SPECIAL_TYPES = [
  'cycle',
  'anniversary',
  'rerelease',
  'festival',
  'meeting',
  'live_music',
  'club',
  'marathon',
] as const;
export type SpecialType = (typeof SPECIAL_TYPES)[number];

// A recurring programme (a chain cycle, a festival, a film club) that groups
// special screenings. The slug is fixed at creation so renames keep URLs;
// incoming names resolve through series_aliases.
export const seriesTable = pgTable('series', {
  id: serial().primaryKey(),
  slug: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  type: varchar({ length: 20 }).$type<SpecialType>().notNull(),
  // Chain or cinema running it, e.g. "Helios"; null when unknown or shared.
  organizer: varchar({ length: 100 }),
  isChainProgramme: boolean().notNull().default(false),
  // Written by hand, never by the scraper.
  description: text(),
  firstSeenAt: timestamp().notNull().defaultNow(),
  lastSeenAt: timestamp().notNull().defaultNow(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

// Normalised name (lowercase, no diacritics) -> series.
export const seriesAliasesTable = pgTable('series_aliases', {
  alias: varchar({ length: 255 }).primaryKey(),
  seriesId: integer()
    .references(() => seriesTable.id, { onDelete: 'cascade' })
    .notNull(),
});

export type Series = typeof seriesTable.$inferSelect;
export type NewSeries = typeof seriesTable.$inferInsert;
