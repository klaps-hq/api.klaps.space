import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { citiesTable } from './cities.schema';

export const cinemasTable = pgTable('cinemas', {
  id: serial().primaryKey(),
  sourceId: integer().notNull().unique(),
  slug: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull(),
  sourceCityId: integer()
    .references(() => citiesTable.sourceId)
    .notNull(),
  longitude: real(),
  latitude: real(),
  street: varchar({ length: 255 }),
  description: text(),
  email: varchar({ length: 255 }),
  website: varchar({ length: 255 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Cinema = typeof cinemasTable.$inferSelect;
export type NewCinema = typeof cinemasTable.$inferInsert;
