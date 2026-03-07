import { ScreeningWithCinemaCity } from 'src/socials/socials.types';

/** Clean city response -- no sourceId or areacode. */
export type CityResponse = {
  id: number;
  slug: string;
  name: string;
  nameDeclinated: string;
  description: string | null;
  numberOfCinemas?: number;
};

/** Clean genre response -- no sourceId or timestamps. */
export type GenreResponse = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};

/** Cinema embedded inside screening responses. */
export type CinemaSummaryResponse = {
  id: number;
  slug: string;
  name: string;
  street: string | null;
  city: CityResponse;
};

/** Full cinema for the detail endpoint. */
export type CinemaResponse = {
  id: number;
  slug: string;
  name: string;
  street: string | null;
  description: string | null;
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
};

/** Actor embedded inside movie response. */
export type ActorResponse = {
  id: number;
  name: string;
};

/** Director embedded inside movie response. */
export type DirectorResponse = {
  id: number;
  name: string;
};

/** Scriptwriter embedded inside movie response. */
export type ScriptwriterResponse = {
  id: number;
  name: string;
};

/** Country embedded inside movie response. */
export type CountryResponse = {
  id: number;
  name: string;
};

/** Extended movie summary with hero fields for random screening. */
export type MovieHeroResponse = MovieSummaryResponse & {
  backdropUrl: string | null;
};

/** Full movie for the detail page. */
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
  actors: ActorResponse[];
  directors: DirectorResponse[];
  scriptwriters: ScriptwriterResponse[];
  countries: CountryResponse[];
  ratings: {
    users: { score: number; votes: number } | null;
    critics: { score: number; votes: number } | null;
  };
  filmwebUrl: string;
};

/** Multi-city movie for territorial reach endpoint. */
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
  screenings: PaginatedResponse<ScreeningResponse | ScreeningGroupResponse>;
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

/** Scored candidate for socials get-candidate endpoint. */
export type ScoredCandidateResponse = {
  movieId: number;
  screeningId: number;
  score: number;
};

export type SocialsGetCandidateResponse = {
  publish: boolean;
  date: {
    from: string;
    to: string;
  };
  reason:
    | 'HAS_HIGH_QUALITY_CANDIDATE'
    | 'NO_HIGH_QUALITY_CANDIDATE'
    | 'NO_SCREENINGS_IN_RANGE'
    | 'ALREADY_PUBLISHED';
  meta: {
    candidatesChecked: number;
    bestScore: number | null;
    minScore: number;
  };
  candidates: ScreeningWithCinemaCity[];
};
