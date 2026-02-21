import { int, mysqlTable, timestamp, unique } from 'drizzle-orm/mysql-core';
import { moviesTable } from './movies.schema';
import { directorsTable } from './directors.schema';

export const moviesDirectorsTable = mysqlTable(
  'movies_directors',
  {
    id: int().primaryKey().autoincrement(),
    movieId: int()
      .references(() => moviesTable.id)
      .notNull(),
    directorId: int()
      .references(() => directorsTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieDirector: unique().on(table.movieId, table.directorId),
  }),
);
