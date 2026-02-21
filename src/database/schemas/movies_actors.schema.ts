import { int, mysqlTable, timestamp, unique } from 'drizzle-orm/mysql-core';
import { moviesTable } from './movies.schema';
import { actorsTable } from './actors.schema';

export const moviesActorsTable = mysqlTable(
  'movies_actors',
  {
    id: int().primaryKey().autoincrement(),
    movieId: int()
      .references(() => moviesTable.id)
      .notNull(),
    actorId: int()
      .references(() => actorsTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieActor: unique().on(table.movieId, table.actorId),
  }),
);
