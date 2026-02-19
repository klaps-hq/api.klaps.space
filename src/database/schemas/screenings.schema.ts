import {
  boolean,
  datetime,
  int,
  mysqlTable,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import { moviesTable } from './movies.schema';
import { showtimesTable } from './showtimes.schema';
import { cinemasTable } from './cinemas.schema';

export const screeningsTable = mysqlTable(
  'screenings',
  {
    id: int().primaryKey().autoincrement(),
    url: varchar({ length: 255 }),
    movieId: int()
      .references(() => moviesTable.id)
      .notNull(),
    showtimeId: int()
      .references(() => showtimesTable.id)
      .notNull(),
    cinemaId: int()
      .references(() => cinemasTable.sourceId)
      .notNull(),
    type: varchar({ length: 255 }).notNull(),
    date: datetime('date').notNull(),
    isDubbing: boolean().notNull(),
    isSubtitled: boolean().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique('screenings_unique').on(
      table.movieId,
      table.cinemaId,
      table.date,
      table.type,
      table.isDubbing,
      table.isSubtitled,
    ),
  ],
);

export type Screening = typeof screeningsTable.$inferSelect;
export type NewScreening = typeof screeningsTable.$inferInsert;
