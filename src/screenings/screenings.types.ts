import { screeningsTable } from '../database/schemas/screenings.schema';
import { Cinema } from '../database/schemas/cinemas.schema';
import { Movie } from 'src/movies/movies.types';
import { Genre } from '../database/schemas/genres.schema';
import { City } from '../database/schemas/cities.schema';

/** Raw DB screening row (used by POST / scrapper). */
export type Screening = typeof screeningsTable.$inferSelect;

/** Params for the screenings list endpoint. */
export type GetScreeningsParams = {
  dateFrom?: string;
  dateTo?: string;
  movieId?: number;
  cityId?: number | undefined;
  citySlug?: string | undefined;
  genreId?: number | undefined;
  genreSlug?: string | undefined;
  cinemaSlug?: string | undefined;
  search?: string;
  page?: number;
  limit?: number;
  cinema?: Cinema;
  movie?: Movie;
  genre?: Genre;
  city?: City;
};
