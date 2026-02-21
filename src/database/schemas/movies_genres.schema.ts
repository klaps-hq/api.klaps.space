import { int, mysqlTable, timestamp, unique } from 'drizzle-orm/mysql-core';
import { moviesTable } from './movies.schema';
import { genresTable } from './genres.schema';

export const moviesGenresTable = mysqlTable(
  'movies_genres',
  {
    id: int().primaryKey().autoincrement(),
    movieId: int()
      .references(() => moviesTable.id)
      .notNull(),
    genreId: int()
      .references(() => genresTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieGenre: unique().on(table.movieId, table.genreId),
  }),
);
