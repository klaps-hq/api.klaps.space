import type {
  ProgrammeProfileResponse,
  ProfileRanked,
} from './screenings.types';

/** One past screening in the requested scope. */
export type ProfileScreeningRow = {
  /** Wall-clock time stored as UTC (see lib/date.ts). */
  date: Date;
  movieId: number;
  cinemaId: number;
  isDubbing: boolean;
};

export type ProfileMovieMeta = {
  id: number;
  slug: string;
  title: string;
  productionYear: number;
};

export type ProfileTagMeta = { movieId: number; slug: string; name: string };

export type ProfileCinemaMeta = {
  /** Source (Filmweb) id, the value screenings reference. */
  sourceId: number;
  slug: string;
  name: string;
  citySlug: string;
  cityName: string;
};

export type ProfileInput = {
  rows: ProfileScreeningRow[];
  movies: ProfileMovieMeta[];
  genres: ProfileTagMeta[];
  directors: ProfileTagMeta[];
  cinemas: ProfileCinemaMeta[];
};

/** How many entries each ranked list carries. */
export const PROFILE_TOP_LIMIT = 5;
/**
 * Longer list for cinemas: in big cities multiplexes take most of the top
 * places, and the frontend drops them from studio-cinema copy, so it needs
 * enough rows left over to name the independent venues.
 */
export const PROFILE_TOP_CINEMAS_LIMIT = 20;

const EMPTY_PROFILE: ProgrammeProfileResponse = {
  since: null,
  until: null,
  screenings: 0,
  movies: 0,
  cinemas: 0,
  cities: 0,
  monthsActive: 0,
  busiestMonth: null,
  weekdays: [0, 0, 0, 0, 0, 0, 0],
  timeOfDay: { morning: 0, afternoon: 0, evening: 0 },
  dubbed: 0,
  decades: [],
  medianProductionYear: null,
  oldestMovie: null,
  topMovies: [],
  topGenres: [],
  topDirectors: [],
  topCinemas: [],
  topCities: [],
};

const toDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Sorts a tally by count (desc), then by name so ties are stable between
 * requests and the rendered copy does not reshuffle on every revalidation.
 */
const rank = <T extends { name: string }>(
  tally: Map<string, T & { count: number }>,
  limit = PROFILE_TOP_LIMIT,
): (T & { count: number })[] =>
  [...tally.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'))
    .slice(0, limit);

const bump = <T extends object>(
  tally: Map<string, T & { count: number }>,
  key: string,
  entry: T,
): void => {
  const current = tally.get(key);
  if (current) current.count += 1;
  else tally.set(key, { ...entry, count: 1 });
};

/**
 * Facts about what a venue, city, genre or director's programme has looked
 * like so far, aggregated from past screenings. Everything here is derived
 * from screening data alone, so each page gets numbers no other site has.
 */
export const buildProgrammeProfile = (
  input: ProfileInput,
): ProgrammeProfileResponse => {
  const movies = new Map(input.movies.map((m) => [m.id, m]));
  // The scraper sometimes keeps a second row for a film it already has
  // (same title and year, slug suffixed "-2") and both rows carry the same
  // screenings. Count such a screening once, under the first row seen.
  const filmKey = (movieId: number): string => {
    const movie = movies.get(movieId);
    return movie
      ? `${movie.title.trim().toLowerCase()}|${movie.productionYear}`
      : `#${movieId}`;
  };
  const seenScreenings = new Set<string>();
  const canonicalMovieId = new Map<string, number>();
  const rows: ProfileScreeningRow[] = [];
  for (const row of input.rows) {
    const key = filmKey(row.movieId);
    const screeningKey = `${key}|${row.cinemaId}|${row.date.getTime()}`;
    if (seenScreenings.has(screeningKey)) continue;
    seenScreenings.add(screeningKey);
    if (!canonicalMovieId.has(key)) canonicalMovieId.set(key, row.movieId);
    rows.push({ ...row, movieId: canonicalMovieId.get(key)! });
  }
  if (rows.length === 0) return EMPTY_PROFILE;

  const cinemas = new Map(input.cinemas.map((c) => [c.sourceId, c]));
  const genresByMovie = new Map<number, ProfileTagMeta[]>();
  for (const tag of input.genres) {
    genresByMovie.set(tag.movieId, [
      ...(genresByMovie.get(tag.movieId) ?? []),
      tag,
    ]);
  }
  const directorsByMovie = new Map<number, ProfileTagMeta[]>();
  for (const tag of input.directors) {
    directorsByMovie.set(tag.movieId, [
      ...(directorsByMovie.get(tag.movieId) ?? []),
      tag,
    ]);
  }

  let since = rows[0].date;
  let until = rows[0].date;
  const months = new Map<string, number>();
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  const timeOfDay = { morning: 0, afternoon: 0, evening: 0 };
  const decades = new Map<number, number>();
  const years: number[] = [];
  let dubbed = 0;

  const topMovies = new Map<string, ProfileRanked & { year: number }>();
  const topGenres = new Map<string, ProfileRanked>();
  const topDirectors = new Map<string, ProfileRanked>();
  const topCinemas = new Map<
    string,
    ProfileRanked & { citySlug: string; cityName: string }
  >();
  const topCities = new Map<string, ProfileRanked>();

  for (const row of rows) {
    if (row.date < since) since = row.date;
    if (row.date > until) until = row.date;

    const month = toDay(row.date).slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
    // Monday-first index: getUTCDay() is Sunday-first, and the stored
    // timestamp already is the Polish wall clock.
    weekdays[(row.date.getUTCDay() + 6) % 7] += 1;
    const hour = row.date.getUTCHours();
    if (hour < 12) timeOfDay.morning += 1;
    else if (hour < 17) timeOfDay.afternoon += 1;
    else timeOfDay.evening += 1;
    if (row.isDubbing) dubbed += 1;

    const movie = movies.get(row.movieId);
    if (movie) {
      const decade = Math.floor(movie.productionYear / 10) * 10;
      decades.set(decade, (decades.get(decade) ?? 0) + 1);
      years.push(movie.productionYear);
      bump(topMovies, movie.slug, {
        slug: movie.slug,
        name: movie.title,
        year: movie.productionYear,
      });
    }
    // A film counts once per genre and per director it carries.
    for (const genre of genresByMovie.get(row.movieId) ?? []) {
      bump(topGenres, genre.slug, { slug: genre.slug, name: genre.name });
    }
    for (const director of directorsByMovie.get(row.movieId) ?? []) {
      bump(topDirectors, director.slug, {
        slug: director.slug,
        name: director.name,
      });
    }
    const cinema = cinemas.get(row.cinemaId);
    if (cinema) {
      bump(topCinemas, cinema.slug, {
        slug: cinema.slug,
        name: cinema.name,
        citySlug: cinema.citySlug,
        cityName: cinema.cityName,
      });
      bump(topCities, cinema.citySlug, {
        slug: cinema.citySlug,
        name: cinema.cityName,
      });
    }
  }

  years.sort((a, b) => a - b);
  const screenedMovies = [...new Set(rows.map((r) => r.movieId))]
    .map((id) => movies.get(id))
    .filter((m): m is ProfileMovieMeta => Boolean(m));
  const oldest = screenedMovies.reduce<ProfileMovieMeta | null>(
    (acc, m) => (!acc || m.productionYear < acc.productionYear ? m : acc),
    null,
  );
  const [busiestKey, busiestCount] = [...months.entries()].reduce(
    (acc, entry) => (entry[1] > acc[1] ? entry : acc),
  );

  return {
    since: toDay(since),
    until: toDay(until),
    screenings: rows.length,
    movies: screenedMovies.length,
    cinemas: new Set(rows.map((r) => r.cinemaId)).size,
    cities: topCities.size,
    monthsActive: months.size,
    busiestMonth: { month: busiestKey, count: busiestCount },
    weekdays,
    timeOfDay,
    dubbed,
    decades: [...decades.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, count]) => ({ decade, count })),
    medianProductionYear: years.length
      ? years[Math.floor(years.length / 2)]
      : null,
    oldestMovie: oldest
      ? {
          slug: oldest.slug,
          title: oldest.title,
          productionYear: oldest.productionYear,
        }
      : null,
    topMovies: rank(topMovies).map(({ slug, name, year, count }) => ({
      slug,
      title: name,
      productionYear: year,
      count,
    })),
    topGenres: rank(topGenres),
    topDirectors: rank(topDirectors),
    topCinemas: rank(topCinemas, PROFILE_TOP_CINEMAS_LIMIT),
    topCities: rank(topCities),
  };
};
