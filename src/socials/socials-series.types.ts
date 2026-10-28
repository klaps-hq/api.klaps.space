export const SERIES_KINDS = ['stats', 'retrospective'] as const;
export type SeriesKind = (typeof SERIES_KINDS)[number];

export type SeriesMovie = {
  id: number;
  slug: string;
  title: string;
  titleOriginal: string;
  productionYear: number;
  description: string;
  duration: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
};

export type MonthStatsResponse = {
  month: string;
  // True once klaps.radar recorded this month's post, so a retry or a second
  // instance does not publish it twice.
  alreadyPublished: boolean;
  screenings: number;
  cinemas: number;
  cities: number;
  topMovie: { movie: SeriesMovie; screenings: number; cities: number } | null;
  oldestMovie: SeriesMovie | null;
  highlights: SeriesMovie[];
  // lat/lon: mean of the city's cinema coordinates, null when none have any.
  byCity: {
    name: string;
    slug: string;
    count: number;
    lat: number | null;
    lon: number | null;
  }[];
  topCinemas: { name: string; slug: string; city: string; count: number }[];
};

export type RetrospectivesResponse = {
  dateFrom: string;
  dateTo: string;
  retrospectives: {
    director: {
      id: number;
      name: string;
      slug: string | null;
      photoUrl: string | null;
    };
    films: { movie: SeriesMovie; from: string; cities: number }[];
  }[];
};
