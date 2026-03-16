import {
  date,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { citiesTable } from './cities.schema';

export const showtimesTable = pgTable('showtimes', {
  id: serial().primaryKey(),
  url: varchar({ length: 255 }).notNull().unique(),
  cityId: integer()
    .notNull()
    .references(() => citiesTable.id),
  date: date({ mode: 'date' }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Showtime = typeof showtimesTable.$inferSelect;
export type NewShowtime = typeof showtimesTable.$inferInsert;
