import { integer, pgTable, serial, timestamp, unique } from 'drizzle-orm/pg-core';
import { moviesTable } from './movies.schema';
import { actorsTable } from './actors.schema';

export const moviesActorsTable = pgTable(
  'movies_actors',
  {
    id: serial().primaryKey(),
    movieId: integer()
      .references(() => moviesTable.id)
      .notNull(),
    actorId: integer()
      .references(() => actorsTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieActor: unique().on(table.movieId, table.actorId),
  }),
);
