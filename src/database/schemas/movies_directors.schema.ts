import { integer, pgTable, serial, timestamp, unique } from 'drizzle-orm/pg-core';
import { moviesTable } from './movies.schema';
import { directorsTable } from './directors.schema';

export const moviesDirectorsTable = pgTable(
  'movies_directors',
  {
    id: serial().primaryKey(),
    movieId: integer()
      .references(() => moviesTable.id)
      .notNull(),
    directorId: integer()
      .references(() => directorsTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieDirector: unique().on(table.movieId, table.directorId),
  }),
);
