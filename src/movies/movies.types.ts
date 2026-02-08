import { genres, movies } from '../database/schema/schema';

export type Movie = typeof movies.$inferSelect;
export type Genre = typeof genres.$inferSelect;

export type MovieWithGenres = Movie & {
  movies_genres: Array<{ genre: Genre }>;
};

export type PaginatedMoviesResponse = {
  data: MovieWithGenres[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type GetMoviesParams = {
  page?: number;
  limit?: number;
};

export type MultiCityMovie = {
  id: number;
  title: string;
  year: number;
  posterUrl: string | null;
  citiesCount: number;
};

export type GetMultiCityMoviesParams = {
  limit?: number;
  minCities?: number;
};
