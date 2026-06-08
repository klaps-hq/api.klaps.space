import { screeningsTable } from '../database/schemas/screenings.schema';
import type { CinemaSummaryResponse } from '../cinemas/cinemas.types';
import type {
  MovieSummaryResponse,
  MovieHeroResponse,
} from '../movies/movies.types';

export type Screening = typeof screeningsTable.$inferSelect;

export type GetScreeningsParams = {
  dateFrom?: string;
  dateTo?: string;
  movieId?: number;
  cityId?: number;
  citySlug?: string;
  voivodeship?: string;
  genreId?: number;
  genreSlug?: string;
  directorId?: number;
  cinemaId?: number;
  cinemaSlug?: string;
  limit?: number;
  search?: string;
};

export type ScreeningResponse = {
  id: number;
  date: string;
  time: string;
  dateTime: string;
  ticketUrl: string | null;
  isDubbing: boolean;
  isSubtitled: boolean;
  cinema: CinemaSummaryResponse;
};

export type ScreeningGroupResponse = {
  movie: MovieSummaryResponse;
  summary: {
    screeningsCount: number;
    cinemasCount: number;
    citiesCount: number;
    cities: string[];
  };
  screenings: ScreeningResponse[];
};

export type RandomScreeningResponse = {
  movie: MovieHeroResponse;
  screening: ScreeningResponse;
};

export type GetLastUpdatedParams = {
  cityId?: number;
  citySlug?: string;
  voivodeship?: string;
  cinemaId?: number;
  cinemaSlug?: string;
  directorId?: number;
};

export type LastUpdatedResponse = {
  // ISO timestamp of the newest screening, or null when none match.
  updatedAt: string | null;
};
