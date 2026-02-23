import type {
  CityResponse,
  GenreResponse,
  ActorResponse,
  DirectorResponse,
  ScriptwriterResponse,
  CountryResponse,
  CinemaSummaryResponse,
  CinemaResponse,
  MovieSummaryResponse,
  MovieHeroResponse,
  MovieResponse,
  ScreeningResponse,
  ScreeningGroupResponse,
} from './response-types';

// ── City ────────────────────────────────────────────────────

/** Strips sourceId and areacode from a city row. */
export const mapCity = (city: {
  id: number;
  slug: string;
  name: string;
  nameDeclinated: string;
}): CityResponse => ({
  id: city.id,
  slug: city.slug,
  name: city.name,
  nameDeclinated: city.nameDeclinated,
});

// ── Genre ───────────────────────────────────────────────────

/** Strips sourceId and timestamps from a genre row. */
export const mapGenre = (genre: {
  id: number;
  slug: string;
  name: string;
}): GenreResponse => ({
  id: genre.id,
  slug: genre.slug,
  name: genre.name,
});

export const mapActor = (actor: {
  id: number;
  name: string;
}): ActorResponse => ({
  id: actor.id,
  name: actor.name,
});

export const mapDirector = (director: {
  id: number;
  name: string;
}): DirectorResponse => ({
  id: director.id,
  name: director.name,
});

export const mapScriptwriter = (scriptwriter: {
  id: number;
  name: string;
}): ScriptwriterResponse => ({
  id: scriptwriter.id,
  name: scriptwriter.name,
});

export const mapCountry = (country: {
  id: number;
  name: string;
}): CountryResponse => ({
  id: country.id,
  name: country.name,
});

// ── Cinema ──────────────────────────────────────────────────

type DbCinemaWithCity = {
  id: number;
  slug: string;
  name: string;
  street: string | null;
  url: string;
  latitude: number | null;
  longitude: number | null;
  city?: { id: number; slug: string; name: string; nameDeclinated: string } | null;
};

/** Maps a cinema + city into a CinemaSummaryResponse. */
export const mapCinemaSummary = (
  cinema: DbCinemaWithCity,
): CinemaSummaryResponse => ({
  id: cinema.id,
  slug: cinema.slug,
  name: cinema.name,
  street: cinema.street,
  city: cinema.city
    ? mapCity(cinema.city)
    : { id: 0, slug: '', name: '', nameDeclinated: '' },
});

/** Maps a cinema + city into a full CinemaResponse. */
export const mapCinemaDetail = (cinema: DbCinemaWithCity): CinemaResponse => ({
  id: cinema.id,
  slug: cinema.slug,
  name: cinema.name,
  street: cinema.street,
  city: cinema.city
    ? mapCity(cinema.city)
    : { id: 0, slug: '', name: '', nameDeclinated: '' },
  latitude: cinema.latitude,
  longitude: cinema.longitude,
  filmwebUrl: cinema.url,
});

// ── Movie ───────────────────────────────────────────────────

type DbMovieWithGenres = {
  id: number;
  slug: string;
  title: string;
  titleOriginal: string;
  description: string;
  productionYear: number;
  duration: number;
  language: string | null;
  posterUrl: string | null;
  backdropUrl?: string | null;
  videoUrl?: string | null;
  url: string;
  worldPremiereDate?: Date | string | null;
  polishPremiereDate?: Date | string | null;
  usersRating?: number | null;
  usersRatingVotes?: number | null;
  criticsRating?: number | null;
  criticsRatingVotes?: number | null;
  movies_genres: Array<{ genre: { id: number; slug: string; name: string } }>;
  movies_actors: Array<{ actor: { id: number; name: string } }>;
  movies_directors: Array<{ director: { id: number; name: string } }>;
  movies_scriptwriters: Array<{
    scriptwriter: { id: number; name: string };
  }>;
  movies_countries: Array<{ country: { id: number; name: string } }>;
};

/** Flattens genres and strips DB internals for cards/lists. */
export const mapMovieSummary = (
  movie: DbMovieWithGenres,
): MovieSummaryResponse => ({
  id: movie.id,
  slug: movie.slug,
  title: movie.title,
  titleOriginal: movie.titleOriginal || null,
  productionYear: movie.productionYear,
  duration: movie.duration > 0 ? movie.duration : null,
  posterUrl: movie.posterUrl,
  genres: movie.movies_genres.map((mg) => mapGenre(mg.genre)),
});

/** Extended summary with hero fields (backdrop, description). */
export const mapMovieHero = (movie: DbMovieWithGenres): MovieHeroResponse => ({
  ...mapMovieSummary(movie),
  description: movie.description || null,
  backdropUrl: movie.backdropUrl ?? null,
});

/** Formats a Date or date-string to "YYYY-MM-DD" or null. */
const formatDateField = (
  value: Date | string | null | undefined,
): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

/** Full movie detail with nested ratings. */
export const mapMovieDetail = (movie: DbMovieWithGenres): MovieResponse => ({
  id: movie.id,
  slug: movie.slug,
  title: movie.title,
  titleOriginal: movie.titleOriginal || null,
  description: movie.description || null,
  productionYear: movie.productionYear,
  duration: movie.duration > 0 ? movie.duration : null,
  language: movie.language || null,
  actors: movie.movies_actors.map((ma) => mapActor(ma.actor)),
  directors: movie.movies_directors.map((md) => mapDirector(md.director)),
  scriptwriters: movie.movies_scriptwriters.map((ms) =>
    mapScriptwriter(ms.scriptwriter),
  ),
  countries: movie.movies_countries.map((mc) => mapCountry(mc.country)),
  posterUrl: movie.posterUrl,
  backdropUrl: movie.backdropUrl ?? null,
  videoUrl: movie.videoUrl ?? null,
  worldPremiereDate: formatDateField(movie.worldPremiereDate),
  polishPremiereDate: formatDateField(movie.polishPremiereDate),
  genres: movie.movies_genres.map((mg) => mapGenre(mg.genre)),
  ratings: {
    users:
      movie.usersRating != null && movie.usersRatingVotes != null
        ? { score: movie.usersRating, votes: movie.usersRatingVotes }
        : null,
    critics:
      movie.criticsRating != null && movie.criticsRatingVotes != null
        ? { score: movie.criticsRating, votes: movie.criticsRatingVotes }
        : null,
  },
  filmwebUrl: movie.url,
});

// ── Screening ───────────────────────────────────────────────

type DbScreeningWithCinema = {
  id: number;
  url: string | null;
  date: Date;
  isDubbing: boolean | number;
  isSubtitled: boolean | number;
  cinema?: DbCinemaWithCity | null;
};

/**
 * Extracts date, time, and ISO 8601 dateTime from a screening datetime.
 * Assumes the stored datetime is already in CET (Europe/Warsaw).
 */
const extractDateTimeParts = (
  dt: Date,
): { date: string; time: string; dateTime: string } => {
  const iso = dt instanceof Date ? dt.toISOString() : String(dt);
  const dateStr = iso.slice(0, 10);
  const timeStr = iso.slice(11, 16);
  return {
    date: dateStr,
    time: timeStr,
    dateTime: `${dateStr}T${iso.slice(11, 19)}Z`,
  };
};

/** Maps a DB screening row into a clean ScreeningResponse. */
export const mapScreening = (
  screening: DbScreeningWithCinema,
): ScreeningResponse => {
  const { date, time, dateTime } = extractDateTimeParts(screening.date);
  return {
    id: screening.id,
    date,
    time,
    dateTime,
    ticketUrl: screening.url ?? null,
    isDubbing: Boolean(screening.isDubbing),
    isSubtitled: Boolean(screening.isSubtitled),
    cinema: screening.cinema
      ? mapCinemaSummary(screening.cinema)
      : {
          id: 0,
          slug: '',
          name: '',
          street: null,
          city: { id: 0, slug: '', name: '', nameDeclinated: '' },
        },
  };
};

/** Wraps a movie + its screenings into a ScreeningGroupResponse with summary. */
export const mapScreeningGroup = (
  movie: DbMovieWithGenres,
  screenings: DbScreeningWithCinema[],
): ScreeningGroupResponse => {
  const mapped = screenings.map(mapScreening);
  const uniqueCinemas = new Set(mapped.map((s) => s.cinema.id));
  const uniqueCities = new Map<number, string>();
  for (const s of mapped) {
    if (s.cinema.city.id > 0) {
      uniqueCities.set(s.cinema.city.id, s.cinema.city.name);
    }
  }
  return {
    movie: mapMovieSummary(movie),
    summary: {
      screeningsCount: mapped.length,
      cinemasCount: uniqueCinemas.size,
      citiesCount: uniqueCities.size,
      cities: [...uniqueCities.values()],
    },
    screenings: mapped,
  };
};
