import { integer, pgTable, serial, timestamp, unique } from 'drizzle-orm/pg-core';
import { moviesTable } from './movies.schema';
import { scriptwritersTable } from './scriptwriters.schema';

export const moviesScriptwritersTable = pgTable(
  'movies_scriptwriters',
  {
    id: serial().primaryKey(),
    movieId: integer()
      .references(() => moviesTable.id)
      .notNull(),
    scriptwriterId: integer()
      .references(() => scriptwritersTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieScriptwriter: unique().on(table.movieId, table.scriptwriterId),
  }),
);
