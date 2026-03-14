import { integer, pgTable, serial, timestamp, unique } from 'drizzle-orm/pg-core';
import { moviesTable } from './movies.schema';
import { genresTable } from './genres.schema';

export const moviesGenresTable = pgTable(
  'movies_genres',
  {
    id: serial().primaryKey(),
    movieId: integer()
      .references(() => moviesTable.id)
      .notNull(),
    genreId: integer()
      .references(() => genresTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieGenre: unique().on(table.movieId, table.genreId),
  }),
);
