import { int, mysqlTable, timestamp, unique } from 'drizzle-orm/mysql-core';
import { moviesTable } from './movies.schema';
import { scriptwritersTable } from './scriptwriters.schema';

export const moviesScriptwritersTable = mysqlTable(
  'movies_scriptwriters',
  {
    id: int().primaryKey().autoincrement(),
    movieId: int()
      .references(() => moviesTable.id)
      .notNull(),
    scriptwriterId: int()
      .references(() => scriptwritersTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieScriptwriter: unique().on(table.movieId, table.scriptwriterId),
  }),
);
