import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { moviesTable } from './movies.schema';
import { showtimesTable } from './showtimes.schema';
import { cinemasTable } from './cinemas.schema';

export const screeningsTable = pgTable(
  'screenings',
  {
    id: serial().primaryKey(),
    url: varchar({ length: 255 }),
    movieId: integer()
      .references(() => moviesTable.id)
      .notNull(),
    showtimeId: integer()
      .references(() => showtimesTable.id)
      .notNull(),
    cinemaId: integer()
      .references(() => cinemasTable.sourceId)
      .notNull(),
    type: varchar({ length: 255 }).notNull(),
    date: timestamp('date').notNull(),
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
