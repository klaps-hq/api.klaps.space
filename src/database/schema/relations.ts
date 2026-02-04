import { relations } from "drizzle-orm/relations";
import { cities, cinemas, actors, movies_actors, movies, countries, movies_countries, directors, movies_directors, genres, movies_genres, movies_scriptwriters, scriptwriters, screenings, showtimes } from "./schema";

export const cinemasRelations = relations(cinemas, ({one, many}) => ({
	city: one(cities, {
		fields: [cinemas.filmwebCityId],
		references: [cities.filmwebId]
	}),
	screenings: many(screenings),
}));

export const citiesRelations = relations(cities, ({many}) => ({
	cinemas: many(cinemas),
	showtimes: many(showtimes),
}));

export const movies_actorsRelations = relations(movies_actors, ({one}) => ({
	actor: one(actors, {
		fields: [movies_actors.actorId],
		references: [actors.id]
	}),
	movie: one(movies, {
		fields: [movies_actors.movieId],
		references: [movies.id]
	}),
}));

export const actorsRelations = relations(actors, ({many}) => ({
	movies_actors: many(movies_actors),
}));

export const moviesRelations = relations(movies, ({many}) => ({
	movies_actors: many(movies_actors),
	movies_countries: many(movies_countries),
	movies_directors: many(movies_directors),
	movies_genres: many(movies_genres),
	movies_scriptwriters: many(movies_scriptwriters),
	screenings: many(screenings),
}));

export const movies_countriesRelations = relations(movies_countries, ({one}) => ({
	country: one(countries, {
		fields: [movies_countries.countryId],
		references: [countries.id]
	}),
	movie: one(movies, {
		fields: [movies_countries.movieId],
		references: [movies.id]
	}),
}));

export const countriesRelations = relations(countries, ({many}) => ({
	movies_countries: many(movies_countries),
}));

export const movies_directorsRelations = relations(movies_directors, ({one}) => ({
	director: one(directors, {
		fields: [movies_directors.directorId],
		references: [directors.id]
	}),
	movie: one(movies, {
		fields: [movies_directors.movieId],
		references: [movies.id]
	}),
}));

export const directorsRelations = relations(directors, ({many}) => ({
	movies_directors: many(movies_directors),
}));

export const movies_genresRelations = relations(movies_genres, ({one}) => ({
	genre: one(genres, {
		fields: [movies_genres.genreId],
		references: [genres.id]
	}),
	movie: one(movies, {
		fields: [movies_genres.movieId],
		references: [movies.id]
	}),
}));

export const genresRelations = relations(genres, ({many}) => ({
	movies_genres: many(movies_genres),
}));

export const movies_scriptwritersRelations = relations(movies_scriptwriters, ({one}) => ({
	movie: one(movies, {
		fields: [movies_scriptwriters.movieId],
		references: [movies.id]
	}),
	scriptwriter: one(scriptwriters, {
		fields: [movies_scriptwriters.scriptwriterId],
		references: [scriptwriters.id]
	}),
}));

export const scriptwritersRelations = relations(scriptwriters, ({many}) => ({
	movies_scriptwriters: many(movies_scriptwriters),
}));

export const screeningsRelations = relations(screenings, ({one}) => ({
	cinema: one(cinemas, {
		fields: [screenings.cinemaId],
		references: [cinemas.filmwebId]
	}),
	movie: one(movies, {
		fields: [screenings.movieId],
		references: [movies.id]
	}),
	showtime: one(showtimes, {
		fields: [screenings.showtimeId],
		references: [showtimes.id]
	}),
}));

export const showtimesRelations = relations(showtimes, ({one, many}) => ({
	screenings: many(screenings),
	city: one(cities, {
		fields: [showtimes.cityId],
		references: [cities.id]
	}),
}));