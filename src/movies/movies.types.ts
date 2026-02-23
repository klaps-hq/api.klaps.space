import { movies } from '../database/schemas';

/** Raw DB movie row (used by POST / scrapper). */
export type Movie = typeof movies.$inferSelect;

/** Params for the paginated movies list. */
export type GetMoviesParams = {
  search?: string;
  genreId?: number;
  genreSlug?: string;
  page?: number;
  limit?: number;
};

/** Params for the multi-city movies endpoint. */
export type GetMultiCityMoviesParams = {
  limit?: number;
};
