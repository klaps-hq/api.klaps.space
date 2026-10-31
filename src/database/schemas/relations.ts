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
import { scriptwritersTable } from './scriptwriters.schema';
import { screeningsTable } from './screenings.schema';
import { showtimesTable } from './showtimes.schema';
import { seriesAliasesTable, seriesTable } from './series.schema';
import { socialsPostsTable } from './socials_posts.schema';
import {
  socialsPlanMediaTable,
  socialsPlansTable,
} from './socials_plans.schema';
import { scrapersTable } from './scrapers.schema';
import { scraperRunsTable } from './scraper_runs.schema';
import { scraperLogsTable } from './scraper_logs.schema';

export const cinemasRelations = relations(cinemasTable, ({ one, many }) => ({
  city: one(citiesTable, {
    fields: [cinemasTable.sourceCityId],
    references: [citiesTable.sourceId],
  }),
  screenings: many(screeningsTable),
}));

export const citiesRelations = relations(citiesTable, ({ many }) => ({
  cinemas: many(cinemasTable),
  showtimes: many(showtimesTable),
}));

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
    references: [cinemasTable.sourceId],
  }),
  movie: one(moviesTable, {
    fields: [screeningsTable.movieId],
    references: [moviesTable.id],
  }),
  showtime: one(showtimesTable, {
    fields: [screeningsTable.showtimeId],
    references: [showtimesTable.id],
  }),
  series: one(seriesTable, {
    fields: [screeningsTable.seriesId],
    references: [seriesTable.id],
  }),
}));

export const seriesRelations = relations(seriesTable, ({ many }) => ({
  screenings: many(screeningsTable),
  aliases: many(seriesAliasesTable),
}));

export const seriesAliasesRelations = relations(
  seriesAliasesTable,
  ({ one }) => ({
    series: one(seriesTable, {
      fields: [seriesAliasesTable.seriesId],
      references: [seriesTable.id],
    }),
  }),
);

export const showtimesRelations = relations(
  showtimesTable,
  ({ one, many }) => ({
    screenings: many(screeningsTable),
    city: one(citiesTable, {
      fields: [showtimesTable.cityId],
      references: [citiesTable.id],
    }),
  }),
);

export const socialsPostsRelations = relations(
  socialsPostsTable,
  ({ one }) => ({
    movie: one(moviesTable, {
      fields: [socialsPostsTable.movieId],
      references: [moviesTable.id],
    }),
    screening: one(screeningsTable, {
      fields: [socialsPostsTable.screeningId],
      references: [screeningsTable.id],
    }),
  }),
);

export const scrapersRelations = relations(scrapersTable, ({ many }) => ({
  runs: many(scraperRunsTable),
}));

export const scraperRunsRelations = relations(
  scraperRunsTable,
  ({ one, many }) => ({
    scraper: one(scrapersTable, {
      fields: [scraperRunsTable.scraperId],
      references: [scrapersTable.id],
    }),
    logs: many(scraperLogsTable),
  }),
);

export const scraperLogsRelations = relations(scraperLogsTable, ({ one }) => ({
  run: one(scraperRunsTable, {
    fields: [scraperLogsTable.runId],
    references: [scraperRunsTable.id],
  }),
}));

export const socialsPlansRelations = relations(
  socialsPlansTable,
  ({ many }) => ({
    media: many(socialsPlanMediaTable),
  }),
);

export const socialsPlanMediaRelations = relations(
  socialsPlanMediaTable,
  ({ one }) => ({
    plan: one(socialsPlansTable, {
      fields: [socialsPlanMediaTable.planId],
      references: [socialsPlansTable.id],
    }),
  }),
);
