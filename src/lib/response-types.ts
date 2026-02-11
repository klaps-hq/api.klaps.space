/** Clean city response -- no filmwebId or areacode. */
export type CityResponse = {
  id: number;
  name: string;
  nameDeclinated: string;
};

/** Clean genre response -- no filmwebId or timestamps. */
export type GenreResponse = {
  id: number;
  name: string;
};

/** Cinema embedded inside screening responses. */
export type CinemaSummaryResponse = {
  id: number;
  name: string;
  street: string | null;
  city: CityResponse;
};

/** Full cinema for the detail endpoint. */
export type CinemaResponse = {
  id: number;
  name: string;
  street: string | null;
  city: CityResponse;
  latitude: number | null;
  longitude: number | null;
  filmwebUrl: string;
};

/** Cinemas grouped by city for the list endpoint. */
export type CinemaGroupResponse = {
  city: CityResponse;
  cinemas: Omit<CinemaSummaryResponse, 'city'>[];
};

/** Movie summary for lists and cards. */
export type MovieSummaryResponse = {
  id: number;
  title: string;
  titleOriginal: string | null;
  productionYear: number;
  duration: number | null;
  posterUrl: string | null;
  genres: GenreResponse[];
};

/** Extended movie summary with hero fields for random screening. */
export type MovieHeroResponse = MovieSummaryResponse & {
  description: string | null;
  backdropUrl: string | null;
};

/** Full movie for the detail page. */
export type MovieResponse = {
  id: number;
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
  ratings: {
    users: { score: number; votes: number } | null;
    critics: { score: number; votes: number } | null;
  };
  filmwebUrl: string;
};

/** Multi-city movie for territorial reach endpoint. */
export type MultiCityMovieResponse = {
  id: number;
  title: string;
  productionYear: number;
  posterUrl: string | null;
  citiesCount: number;
};

/** Single screening with nested cinema. */
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

/** Screenings grouped by movie for the home/cinema page. */
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

/** Random retro screening for the hero section. */
export type RandomScreeningResponse = {
  movie: MovieHeroResponse;
  screening: ScreeningResponse;
};

export type CityDetailResponse = {
  city: CityResponse;
  screenings: ScreeningResponse[] | ScreeningGroupResponse[];
};

/** Generic paginated response wrapper. */
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
