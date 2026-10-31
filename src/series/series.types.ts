import type { SpecialType } from '../database/schemas/series.schema';
import type { MovieSummaryResponse } from '../movies/movies.types';
import type { ScreeningGroupResponse } from '../screenings/screenings.types';

export type SeriesResponse = {
  id: number;
  slug: string;
  name: string;
  type: SpecialType;
  organizer: string | null;
  isChainProgramme: boolean;
  description: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  upcomingCount: number;
  upcomingVenues: number;
  upcomingCities: number;
  /** Upcoming screenings outside chain multiplexes. */
  independentUpcomingCount: number;
  /** Screenings in the last SERIES_PAST_DAYS days. */
  pastCount: number;
  /** When the newest screening of the series was added; sitemap lastmod. */
  lastScreeningAddedAt: string | null;
};

export type SeriesPastMovieResponse = {
  movie: MovieSummaryResponse;
  /** Wall-clock date of the last screening in the series, YYYY-MM-DD. */
  lastScreeningDate: string;
  screeningsCount: number;
};

export type SeriesDetailResponse = SeriesResponse & {
  /** Upcoming screenings, grouped per film like GET /screenings. */
  screenings: ScreeningGroupResponse[];
  /** Films shown in the last SERIES_PAST_DAYS days, so the page is never empty off season. */
  pastMovies: SeriesPastMovieResponse[];
};
