import { relations } from 'drizzle-orm/relations';
import { citiesTable } from './cities.schema';
import { cinemasTable } from './cinemas.schema';
import { actorsTable } from './actors.schema';
import { moviesActorsTable } from './movies_actors.schema';
import { moviesTable } from './movies.schema';
import { countriesTable } from './countries.schema';
import { moviesCountriesTable } from './movies_countries.schema';
import { directorsTable } from './directors.schema';
import { moviesDirectorsTable } from './movies_directors.schema';
import { genresTable } from './genres.schema';
import { moviesGenresTable } from './movies_genres.schema';
import { moviesScriptwritersTable } from './movies_scriptwriters.schema';
import { processedCitiesTable } from './processed_cities.schema';
import { processedShowtimesTable } from './processed_showtimes.schema';
import { scriptwritersTable } from './scriptwriters.schema';
import { screeningsTable } from './screenings.schema';
import { showtimesTable } from './showtimes.schema';

export const cinemasRelations = relations(cinemasTable, ({ one, many }) => ({
  city: one(citiesTable, {
    fields: [cinemasTable.filmwebCityId],
    references: [citiesTable.filmwebId],
  }),
  screenings: many(screeningsTable),
}));

export const citiesRelations = relations(citiesTable, ({ many }) => ({
  cinemas: many(cinemasTable),
  showtimes: many(showtimesTable),
  processedCities: many(processedCitiesTable),
}));

export const processedCitiesRelations = relations(
  processedCitiesTable,
  ({ one }) => ({
    city: one(citiesTable, {
      fields: [processedCitiesTable.cityId],
      references: [citiesTable.id],
    }),
  }),
);

export const moviesActorsRelations = relations(
  moviesActorsTable,
  ({ one }) => ({
    actor: one(actorsTable, {
      fields: [moviesActorsTable.actorId],
      references: [actorsTable.id],
    }),
    movie: one(moviesTable, {
      fields: [moviesActorsTable.movieId],
      references: [moviesTable.id],
    }),
  }),
);

export const actorsRelations = relations(actorsTable, ({ many }) => ({
  movies_actors: many(moviesActorsTable),
}));

export const moviesRelations = relations(moviesTable, ({ many }) => ({
  movies_actors: many(moviesActorsTable),
  movies_countries: many(moviesCountriesTable),
  movies_directors: many(moviesDirectorsTable),
  movies_genres: many(moviesGenresTable),
  movies_scriptwriters: many(moviesScriptwritersTable),
  screenings: many(screeningsTable),
}));

export const moviesCountriesRelations = relations(
  moviesCountriesTable,
  ({ one }) => ({
    country: one(countriesTable, {
      fields: [moviesCountriesTable.countryId],
      references: [countriesTable.id],
    }),
    movie: one(moviesTable, {
      fields: [moviesCountriesTable.movieId],
      references: [moviesTable.id],
    }),
  }),
);

export const countriesRelations = relations(countriesTable, ({ many }) => ({
  movies_countries: many(moviesCountriesTable),
}));

export const moviesDirectorsRelations = relations(
  moviesDirectorsTable,
  ({ one }) => ({
    director: one(directorsTable, {
      fields: [moviesDirectorsTable.directorId],
      references: [directorsTable.id],
    }),
    movie: one(moviesTable, {
      fields: [moviesDirectorsTable.movieId],
      references: [moviesTable.id],
    }),
  }),
);

export const directorsRelations = relations(directorsTable, ({ many }) => ({
  movies_directors: many(moviesDirectorsTable),
}));

export const moviesGenresRelations = relations(
  moviesGenresTable,
  ({ one }) => ({
    genre: one(genresTable, {
      fields: [moviesGenresTable.genreId],
      references: [genresTable.id],
    }),
    movie: one(moviesTable, {
      fields: [moviesGenresTable.movieId],
      references: [moviesTable.id],
    }),
  }),
);

export const genresRelations = relations(genresTable, ({ many }) => ({
  movies_genres: many(moviesGenresTable),
}));

export const moviesScriptwritersRelations = relations(
  moviesScriptwritersTable,
  ({ one }) => ({
    movie: one(moviesTable, {
      fields: [moviesScriptwritersTable.movieId],
      references: [moviesTable.id],
    }),
    scriptwriter: one(scriptwritersTable, {
      fields: [moviesScriptwritersTable.scriptwriterId],
      references: [scriptwritersTable.id],
    }),
  }),
);

export const scriptwritersRelations = relations(
  scriptwritersTable,
  ({ many }) => ({
    movies_scriptwriters: many(moviesScriptwritersTable),
  }),
);

export const screeningsRelations = relations(screeningsTable, ({ one }) => ({
  cinema: one(cinemasTable, {
    fields: [screeningsTable.cinemaId],
    references: [cinemasTable.filmwebId],
  }),
  movie: one(moviesTable, {
    fields: [screeningsTable.movieId],
    references: [moviesTable.id],
  }),
  showtime: one(showtimesTable, {
    fields: [screeningsTable.showtimeId],
    references: [showtimesTable.id],
  }),
}));

export const showtimesRelations = relations(
  showtimesTable,
  ({ one, many }) => ({
    screenings: many(screeningsTable),
    city: one(citiesTable, {
      fields: [showtimesTable.cityId],
      references: [citiesTable.id],
    }),
    processedShowtime: one(processedShowtimesTable, {
      fields: [showtimesTable.id],
      references: [processedShowtimesTable.showtimeId],
    }),
  }),
);

export const processedShowtimesRelations = relations(
  processedShowtimesTable,
  ({ one }) => ({
    showtime: one(showtimesTable, {
      fields: [processedShowtimesTable.showtimeId],
      references: [showtimesTable.id],
    }),
  }),
);
