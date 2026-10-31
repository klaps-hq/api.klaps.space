import { Injectable } from '@nestjs/common';
import { isChainCinemaName } from '../cinemas/cinema-chains';
import {
  getDatePlusDays,
  getTodayInPoland,
  toDateOnlyString,
} from '../lib/date';
import { SocialsSeriesRepository } from './socials-series.repository';
import type {
  MonthStatsResponse,
  RetrospectivesResponse,
  SeriesKind,
} from './socials-series.types';

const TOP_CITIES = 15;
const TOP_CINEMAS = 5;
const HIGHLIGHTS = 6;
const MAX_RETROSPECTIVES = 5;
// A director featured in a retrospective is not featured again for a quarter.
export const RETROSPECTIVE_COOLDOWN_DAYS = 90;

const seriesReason = (kind: SeriesKind, key: string) => `SERIES:${kind}:${key}`;

const countBy = <T>(items: T[], key: (item: T) => number | null) => {
  const counts = new Map<number, number>();
  for (const item of items) {
    const k = key(item);
    if (k !== null) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
};

const topEntries = (counts: Map<number, number>, n: number) =>
  [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

@Injectable()
export class SocialsSeriesService {
  constructor(private readonly repo: SocialsSeriesRepository) {}

  // "Klaps w liczbach": classic screenings in a calendar month. Screening
  // timestamps hold Polish wall-clock time labelled as UTC, so the month
  // bounds are built the same way.
  async getMonthStats(month: string): Promise<MonthStatsResponse> {
    const [year, m] = month.split('-').map(Number);
    const from = new Date(Date.UTC(year, m - 1, 1));
    const to = new Date(Date.UTC(year, m, 1));

    const [rows, posts] = await Promise.all([
      this.repo.findClassicScreenings(from, to),
      this.repo.findSeriesPosts('stats', `${month}-01`),
    ]);
    const alreadyPublished = posts.some(
      (p) => p.reason === seriesReason('stats', month),
    );

    const byMovie = countBy(rows, (r) => r.movieId);
    const byCinema = countBy(rows, (r) => r.cinemaId);
    const cinemas = await this.repo.findCinemasByIds([...byCinema.keys()]);
    const cinemaById = new Map(cinemas.map((c) => [c.id, c]));

    // City totals, with the city placed at the mean of its cinemas' coordinates.
    const cities = new Map<
      number,
      {
        name: string;
        slug: string;
        count: number;
        lat: number[];
        lon: number[];
      }
    >();
    for (const [cinemaId, count] of byCinema) {
      const cinema = cinemaById.get(cinemaId);
      if (!cinema) continue;
      const city = cities.get(cinema.cityId) ?? {
        name: cinema.cityName,
        slug: cinema.citySlug,
        count: 0,
        lat: [],
        lon: [],
      };
      city.count += count;
      if (cinema.latitude !== null && cinema.longitude !== null) {
        city.lat.push(cinema.latitude);
        city.lon.push(cinema.longitude);
      }
      cities.set(cinema.cityId, city);
    }
    const mean = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

    const topMovieIds = topEntries(byMovie, HIGHLIGHTS).map(([id]) => id);
    const movies = await this.repo.findMoviesByIds([...byMovie.keys()]);
    const movieById = new Map(movies.map((mv) => [mv.id, mv]));
    const oldest = movies.reduce<(typeof movies)[number] | null>(
      (best, mv) =>
        !best || mv.productionYear < best.productionYear ? mv : best,
      null,
    );

    const topMovieId = topMovieIds[0];
    const topMovieCities = new Set(
      rows
        .filter((r) => r.movieId === topMovieId)
        .map((r) => cinemaById.get(r.cinemaId ?? -1)?.cityId)
        .filter(Boolean),
    );

    return {
      month,
      alreadyPublished,
      screenings: rows.length,
      cinemas: byCinema.size,
      cities: cities.size,
      topMovie:
        topMovieId !== undefined && movieById.has(topMovieId)
          ? {
              movie: movieById.get(topMovieId)!,
              screenings: byMovie.get(topMovieId)!,
              cities: topMovieCities.size,
            }
          : null,
      oldestMovie: oldest,
      highlights: topMovieIds
        .map((id) => movieById.get(id))
        .filter((mv) => mv !== undefined),
      byCity: [...cities.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_CITIES)
        .map((c) => ({
          name: c.name,
          slug: c.slug,
          count: c.count,
          lat: mean(c.lat),
          lon: mean(c.lon),
        })),
      // Studio cinemas only: the site ranks them for the monthly badge, so a
      // chain venue in the top five would leave an empty spot. Ties go by name
      // so the order does not depend on row order.
      topCinemas: [...byCinema.entries()]
        .flatMap(([id, count]) => {
          const cinema = cinemaById.get(id);
          return cinema && !isChainCinemaName(cinema.name)
            ? [
                {
                  name: cinema.name,
                  slug: cinema.slug,
                  city: cinema.cityName,
                  count,
                },
              ]
            : [];
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'))
        .slice(0, TOP_CINEMAS),
    };
  }

  // Directors with at least `minFilms` different films screening in
  // [dateFrom, dateTo], skipping those featured within the cooldown.
  async getRetrospectives(
    dateFrom: string,
    dateTo: string,
    minFilms: number,
  ): Promise<RetrospectivesResponse> {
    const from = new Date(`${dateFrom}T00:00:00Z`);
    const to = new Date(`${getDatePlusDays(dateTo, 1)}T00:00:00Z`);
    const since = getDatePlusDays(
      getTodayInPoland(),
      -RETROSPECTIVE_COOLDOWN_DAYS,
    );

    const [rows, posts] = await Promise.all([
      this.repo.findDirectorScreenings(from, to),
      this.repo.findSeriesPosts('retrospective', since),
    ]);
    const recent = new Set(posts.map((p) => p.reason));

    type Film = { first: Date; cities: Set<number> };
    const byDirector = new Map<number, Map<number, Film>>();
    for (const row of rows) {
      if (row.movieId === null || row.directorId === null) continue;
      const films = byDirector.get(row.directorId) ?? new Map<number, Film>();
      const film = films.get(row.movieId) ?? {
        first: row.date,
        cities: new Set<number>(),
      };
      if (row.date < film.first) film.first = row.date;
      film.cities.add(row.cityId);
      films.set(row.movieId, film);
      byDirector.set(row.directorId, films);
    }

    const picked = [...byDirector.entries()]
      .filter(
        ([directorId, films]) =>
          films.size >= minFilms &&
          !recent.has(seriesReason('retrospective', String(directorId))),
      )
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, MAX_RETROSPECTIVES);

    const [directors, movies] = await Promise.all([
      this.repo.findDirectorsByIds(picked.map(([id]) => id)),
      this.repo.findMoviesByIds(
        picked.flatMap(([, films]) => [...films.keys()]),
      ),
    ]);
    const directorById = new Map(directors.map((d) => [d.id, d]));
    const movieById = new Map(movies.map((mv) => [mv.id, mv]));

    return {
      dateFrom,
      dateTo,
      retrospectives: picked
        .map(([directorId, films]) => {
          const director = directorById.get(directorId);
          if (!director) return null;
          return {
            director,
            films: [...films.entries()]
              .map(([movieId, film]) => {
                const movie = movieById.get(movieId);
                return movie
                  ? {
                      movie,
                      from: toDateOnlyString(film.first.toISOString()),
                      cities: film.cities.size,
                    }
                  : null;
              })
              .filter((f) => f !== null)
              .sort((a, b) => a.from.localeCompare(b.from)),
          };
        })
        .filter((r) => r !== null),
    };
  }

  async recordSeriesPost(
    kind: SeriesKind,
    key: string,
    platform: string,
  ): Promise<void> {
    await this.repo.insertSeriesPost({
      postDate: getTodayInPoland(),
      platform,
      contentType: kind,
      reason: seriesReason(kind, key),
    });
  }
}
