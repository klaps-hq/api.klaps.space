import {
  float,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { citiesTable } from './cities.schema';

export const cinemasTable = mysqlTable('cinemas', {
  id: int().primaryKey().autoincrement(),
  sourceId: int().notNull().unique(),
  slug: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 255 }).notNull(),
  sourceCityId: int()
    .references(() => citiesTable.sourceId)
    .notNull(),
  longitude: float(),
  latitude: float(),
  street: varchar({ length: 255 }),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Cinema = typeof cinemasTable.$inferSelect;
export type NewCinema = typeof cinemasTable.$inferInsert;
