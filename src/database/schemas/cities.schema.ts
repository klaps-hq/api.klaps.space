import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const citiesTable = pgTable('cities', {
  id: serial().primaryKey(),
  sourceId: integer().notNull().unique(),
  slug: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  nameDeclinated: varchar({ length: 255 }).notNull(),
  areacode: integer(),
  population: integer(),
  voivodeship: varchar({ length: 50 }),
  description: text(),
  // Long researched guide to the city's cinemas (plain paragraphs separated
  // by blank lines). Written by scripts, never touched by the scraper.
  guide: text(),
  lastScrapedAt: timestamp(),
});

export type City = typeof citiesTable.$inferSelect;
export type NewCity = typeof citiesTable.$inferInsert;
