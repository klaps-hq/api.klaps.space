import { integer, pgTable, serial, timestamp, unique } from 'drizzle-orm/pg-core';
import { moviesTable } from './movies.schema';
import { countriesTable } from './countries.schema';

export const moviesCountriesTable = pgTable(
  'movies_countries',
  {
    id: serial().primaryKey(),
    movieId: integer()
      .references(() => moviesTable.id)
      .notNull(),
    countryId: integer()
      .references(() => countriesTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieCountry: unique().on(table.movieId, table.countryId),
  }),
);
