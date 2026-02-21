import {
  date,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { citiesTable } from './cities.schema';

export const showtimesTable = mysqlTable('showtimes', {
  id: int().primaryKey().autoincrement(),
  url: varchar({ length: 255 }).notNull().unique(),
  cityId: int()
    .notNull()
    .references(() => citiesTable.id),
  date: date().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Showtime = typeof showtimesTable.$inferSelect;
export type NewShowtime = typeof showtimesTable.$inferInsert;
