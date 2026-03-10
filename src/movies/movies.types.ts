import { movies } from '../database/schemas';

export type Movie = typeof movies.$inferSelect;

export type GetMoviesParams = {
  search?: string;
  genreId?: number;
  genreSlug?: string;
};

export type GetMultiCityMoviesParams = {
  limit?: number;
};
