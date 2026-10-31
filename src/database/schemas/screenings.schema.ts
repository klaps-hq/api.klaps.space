import {
  boolean,
  index,
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
import { seriesTable, type SpecialType } from './series.schema';

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
    // Special screenings (cycles, anniversaries, festivals...), set by the
    // ticketing scraper; Filmweb does not publish them.
    specialType: varchar({ length: 20 }).$type<SpecialType>(),
    specialLabel: varchar({ length: 255 }),
    // Short normalised note, e.g. "30. rocznica", "4K", "wersja reżyserska".
    editionNote: varchar({ length: 100 }),
    seriesId: integer().references(() => seriesTable.id, {
      onDelete: 'set null',
    }),
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
    index('screenings_series_id_idx').on(table.seriesId),
  ],
);

export type Screening = typeof screeningsTable.$inferSelect;
export type NewScreening = typeof screeningsTable.$inferInsert;
