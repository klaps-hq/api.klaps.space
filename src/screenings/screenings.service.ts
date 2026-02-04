import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { DRIZZLE } from '../database/constants';
import * as schema from '../database/schema/schema';

import {
  getDateRange,
  getTodayDateString,
  pickRandomElement,
} from '../lib/utils';
import type {
  GetScreeningsParams,
  MovieWithScreenings,
  Screening,
  ScreeningWithMovie,
  ScreeningWithStartTime,
} from './screenings.types';
import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  lte,
  ne,
  SQL,
} from 'drizzle-orm';

const DEFAULT_MOVIE_LIMIT = 50;
const SCREENINGS_FETCH_LIMIT = 2000;
const RETRO_YEAR_THRESHOLD = 2000;

@Injectable()
export class ScreeningsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async getScreenings(
    params?: GetScreeningsParams,
  ): Promise<MovieWithScreenings[]> {
    const dateStr = params?.date ?? getTodayDateString();
    const { startOfDay, endOfDay } = getDateRange(dateStr);

    const rows = await this.db.query.screenings.findMany({
      where: and(
        gte(schema.screenings.date, startOfDay),
        lte(schema.screenings.date, endOfDay),
      ),
      with: {
        movie: {
          with: {
            movies_genres: { with: { genre: true } },
          },
        },
      },
      limit: SCREENINGS_FETCH_LIMIT,
    });

    const groupedScreenings = this.groupScreeningsByMovie(rows) ?? [];
    return groupedScreenings.slice(0, DEFAULT_MOVIE_LIMIT);
  }

  async getRandomRetroScreening(): Promise<MovieWithScreenings | null> {
    const { startOfDay } = getDateRange(getTodayDateString());

    const retroMovies = await this.db.query.movies.findMany({
      where: and(
        lt(schema.movies.productionYear, RETRO_YEAR_THRESHOLD),
        isNotNull(schema.movies.backdropUrl),
        ne(schema.movies.backdropUrl, ''),
      ),
      columns: { id: true },
    });
    const retroMovieIds = retroMovies.map((m) => m.id);
    if (retroMovieIds.length === 0) return null;

    const candidateScreenings = await this.db.query.screenings.findMany({
      where: and(
        gte(schema.screenings.date, startOfDay),
        inArray(schema.screenings.movieId, retroMovieIds),
      ),
      with: {
        movie: {
          with: {
            movies_genres: { with: { genre: true } },
          },
        },
      },
      limit: SCREENINGS_FETCH_LIMIT,
    });

    if (candidateScreenings.length === 0) return null;
    const chosenScreening = pickRandomElement(candidateScreenings);

    const screenings = await this.db.query.screenings.findMany({
      where: and(
        eq(schema.screenings.movieId, chosenScreening.movieId),
        gte(schema.screenings.date, startOfDay),
      ),
      with: {
        movie: {
          with: {
            movies_genres: { with: { genre: true } },
          },
        },
      },
      limit: SCREENINGS_FETCH_LIMIT,
    });

    const groupedScreenings = this.groupScreeningsByMovie(screenings);
    if (groupedScreenings === null) return null;

    return groupedScreenings[0];
  }

  private groupScreeningsByMovie(
    screenings: ScreeningWithMovie[],
  ): MovieWithScreenings[] | null {
    const byMovie = new Map<number, ScreeningWithMovie[]>();
    for (const screening of screenings) {
      const existing = byMovie.get(screening.movieId);
      if (existing) {
        existing.push(screening);
      } else {
        byMovie.set(screening.movieId, [screening]);
      }
    }
    return Array.from(byMovie.values()).map((screenings) => ({
      movie: screenings[0]!.movie,
      screenings: screenings.map((s) => ({
        ...s,
        startTime: s.date,
      })),
    }));
  }
}
