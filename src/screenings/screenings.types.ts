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

export type GetRecentScreeningsParams = {
  cinemaId?: number;
  cinemaSlug?: string;
  cityId?: number;
  citySlug?: string;
  days?: number;
  limit?: number;
};

/**
 * One film recently screened in the requested scope and not scheduled there
 * any more. Aggregated per film rather than per screening: the consumer
 * shows "what this venue has been playing", not a showtime list.
 */
export type RecentScreeningResponse = {
  movie: MovieSummaryResponse;
  /** Wall-clock date of the most recent screening, YYYY-MM-DD. */
  lastScreeningDate: string;
  /** Screenings of this film in the scope within the look-back window. */
  screeningsCount: number;
  /**
   * Whether the film is scheduled anywhere in the default 30-day window,
   * the same one that decides if its movie page is indexable. Lets the
   * frontend link only to movie pages that are not noindexed.
   */
  hasUpcomingScreenings: boolean;
};
