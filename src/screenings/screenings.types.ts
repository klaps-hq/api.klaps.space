import { screeningsTable } from '../database/schemas/screenings.schema';
import type { SpecialType } from '../database/schemas/series.schema';
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
  openAir?: boolean;
  classic?: boolean;
  special?: boolean;
  specialType?: SpecialType;
  seriesSlug?: string;
};

export type ScreeningResponse = {
  id: number;
  date: string;
  time: string;
  dateTime: string;
  type: string;
  ticketUrl: string | null;
  isDubbing: boolean;
  isSubtitled: boolean;
  /** Cycle, anniversary, festival... null for a regular screening. */
  specialType: SpecialType | null;
  /** The provider's label as published, e.g. "Helios RePlay". */
  specialLabel: string | null;
  /** Short note for badges and titles, e.g. "30. rocznica", "4K". */
  editionNote: string | null;
  seriesId: number | null;
  seriesSlug: string | null;
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

export type GetRecentVenuesParams = {
  movieId: number;
  days?: number;
  limit?: number;
};

/**
 * One venue where a film played within the look-back window. Backs the
 * "Ostatnio w kinach" section of a movie page between screening runs.
 */
export type RecentVenueResponse = {
  cinema: {
    slug: string;
    name: string;
    city: { name: string; slug: string };
  };
  /** Wall-clock date of the film's most recent screening there, YYYY-MM-DD. */
  lastScreeningDate: string;
  /** Screenings of the film there within the look-back window. */
  screeningsCount: number;
};

export type GetRecentScreeningsParams = {
  cinemaId?: number;
  cinemaSlug?: string;
  cityId?: number;
  citySlug?: string;
  days?: number;
  limit?: number;
  openAir?: boolean;
  classic?: boolean;
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

export type GetProgrammeProfileParams = {
  cinemaSlug?: string;
  citySlug?: string;
  genreSlug?: string;
  directorSlug?: string;
  movieSlug?: string;
  /**
   * Count chain multiplexes too. Only matters for the genre and director
   * scopes, which leave them out by default; cinema, city and movie scopes
   * always include every venue.
   */
  includeChains?: boolean;
  /**
   * City scope only: count independent cinemas alone. The "Kina studyjne w
   * [mieście]" page otherwise showed multiplex numbers under that heading.
   */
  independentOnly?: boolean;
};

/** A ranked entity in a programme profile: a genre, director, city, etc. */
export type ProfileRanked = { slug: string; name: string; count: number };

/**
 * What the programme of one cinema, city, genre or director has looked like
 * so far, from past screenings only (the live repertoire covers the rest).
 * Counts are screenings, not films, unless the field says otherwise.
 */
export type ProgrammeProfileResponse = {
  /** First and last past screening day in the scope, YYYY-MM-DD. */
  since: string | null;
  until: string | null;
  screenings: number;
  /** Distinct films, cinemas and cities behind those screenings. */
  movies: number;
  cinemas: number;
  cities: number;
  /** Calendar months with at least one screening. */
  monthsActive: number;
  busiestMonth: { month: string; count: number } | null;
  /** Screenings per weekday, Monday first. */
  weekdays: number[];
  /** Before 12:00, 12:00-16:59, from 17:00 (Polish wall clock). */
  timeOfDay: { morning: number; afternoon: number; evening: number };
  /** Screenings with Polish dubbing. */
  dubbed: number;
  decades: { decade: number; count: number }[];
  medianProductionYear: number | null;
  oldestMovie: { slug: string; title: string; productionYear: number } | null;
  topMovies: {
    slug: string;
    title: string;
    productionYear: number;
    count: number;
  }[];
  topGenres: ProfileRanked[];
  topDirectors: ProfileRanked[];
  topCinemas: (ProfileRanked & { citySlug: string; cityName: string })[];
  topCities: ProfileRanked[];
};
