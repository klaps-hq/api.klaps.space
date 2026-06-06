import { movies } from '../database/schemas';
import type { GenreResponse } from '../genres/genres.types';

export type Movie = typeof movies.$inferSelect;

export type GetMoviesParams = {
  search?: string;
  genreId?: number;
  genreSlug?: string;
  page?: number;
  limit?: number;
};

export type GetMultiCityMoviesParams = {
  limit?: number;
};

export type MovieSummaryResponse = {
  id: number;
  sourceId: number;
  slug: string;
  url: string;
  title: string;
  titleOriginal: string | null;
  description: string | null;
  productionYear: number;
  duration: number | null;
  posterUrl: string | null;
  videoUrl: string | null;
  genres: GenreResponse[];
  /** ISO 8601 UTC; ostatnia zauważalna zmiana treści (film lub jego seanse). */
  updatedAt?: string;
};

export type MovieHeroResponse = MovieSummaryResponse & {
  backdropUrl: string | null;
};

export type MovieResponse = {
  id: number;
  slug: string;
  title: string;
  titleOriginal: string | null;
  description: string | null;
  productionYear: number;
  duration: number | null;
  language: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  videoUrl: string | null;
  worldPremiereDate: string | null;
  polishPremiereDate: string | null;
  genres: GenreResponse[];
  actors: { id: number; name: string }[];
  directors: { id: number; name: string }[];
  scriptwriters: { id: number; name: string }[];
  countries: { id: number; name: string }[];
  ratings: {
    users: { score: number; votes: number } | null;
    critics: { score: number; votes: number } | null;
  };
  filmwebUrl: string;
};

export type MultiCityMovieResponse = {
  id: number;
  slug: string;
  title: string;
  productionYear: number;
  posterUrl: string | null;
  citiesCount: number;
  description: string | null;
  duration: number | null;
};
