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
  description: text(),
  lastScrapedAt: timestamp(),
});

export type City = typeof citiesTable.$inferSelect;
export type NewCity = typeof citiesTable.$inferInsert;
