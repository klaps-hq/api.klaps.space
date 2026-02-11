import { int, mysqlTable, timestamp, unique } from "drizzle-orm/mysql-core";
import { moviesTable } from "./movies.schema";
import { countriesTable } from "./countries.schema";

export const moviesCountriesTable = mysqlTable(
  "movies_countries",
  {
    id: int().primaryKey().autoincrement(),
    movieId: int()
      .references(() => moviesTable.id)
      .notNull(),
    countryId: int()
      .references(() => countriesTable.id)
      .notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieCountry: unique().on(table.movieId, table.countryId),
  })
);
