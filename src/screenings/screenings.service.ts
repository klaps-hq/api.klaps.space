import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { DRIZZLE } from '../database/constants';
import * as schema from '../database/schema/schema';
import * as relations from '../database/schema/relations';

import { getDateRangeUpToMonthFromNow } from '../lib/utils';
import { randomInt } from 'node:crypto';
import type {
  GetScreeningsParams,
  MovieWithScreenings,
} from './screenings.types';
import { and, eq, gte, inArray, isNotNull, lte, ne } from 'drizzle-orm';

type FullSchema = typeof schema & typeof relations;

const DEFAULT_MOVIE_LIMIT = 10;
const MAX_MOVIE_LIMIT = 100;
const RETRO_YEAR_THRESHOLD = 2026;

@Injectable()
export class ScreeningsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  async getScreenings(
    params?: GetScreeningsParams,
  ): Promise<MovieWithScreenings[]> {
    const { startDay, endDay } = getDateRangeUpToMonthFromNow(
      params?.dateFrom,
      params?.dateTo,
    );
    const limit = Math.min(
      params?.limit ?? DEFAULT_MOVIE_LIMIT,
      MAX_MOVIE_LIMIT,
    );

    const movieIdsResult = await this.db
      .selectDistinct({ movieId: schema.screenings.movieId })
      .from(schema.screenings)
      .innerJoin(
        schema.showtimes,
        eq(schema.screenings.showtimeId, schema.showtimes.id),
      )
      .leftJoin(
        schema.movies_genres,
        eq(schema.screenings.movieId, schema.movies_genres.movieId),
      )
      .where(
        and(
          gte(schema.screenings.date, startDay),
          lte(schema.screenings.date, endDay),
          params?.cityId
            ? eq(schema.showtimes.cityId, params.cityId)
            : undefined,
          params?.genreId
            ? eq(schema.movies_genres.genreId, params.genreId)
            : undefined,
        ),
      )
      .limit(limit);

    const movieIds = movieIdsResult.map((r) => r.movieId);
    if (movieIds.length === 0) return [];

    const movies = await this.db.query.movies.findMany({
      where: inArray(schema.movies.id, movieIds),
      with: {
        movies_genres: { with: { genre: true } },
        screenings: {
          with: { cinema: true },
          where: and(
            gte(schema.screenings.date, startDay),
            lte(schema.screenings.date, endDay),
            params?.cityId
              ? inArray(
                  schema.screenings.showtimeId,
                  this.db
                    .select({ id: schema.showtimes.id })
                    .from(schema.showtimes)
                    .where(eq(schema.showtimes.cityId, params.cityId)),
                )
              : undefined,
          ),
        },
      },
    });

    return movies
      .filter(({ screenings }) => screenings.length > 0)
      .map(({ screenings, ...movie }) => ({
        movie,
        screenings: screenings.map(({ cinema, ...s }) => ({
          ...s,
          startTime: s.date,
          cinemaName: cinema?.name ?? '',
        })),
      }));
  }

  async getRandomRetroScreening(): Promise<MovieWithScreenings | null> {
    const { startDay, endDay } = getDateRangeUpToMonthFromNow();

    const retroMovies = await this.db.query.movies.findMany({
      where: and(
        lte(schema.movies.productionYear, RETRO_YEAR_THRESHOLD),
        isNotNull(schema.movies.backdropUrl),
        ne(schema.movies.backdropUrl, ''),
      ),
      columns: { id: true },
    });

    const retroMovieIds = retroMovies.map((m) => m.id);
    if (retroMovieIds.length === 0) return null;

    const candidateMovies = await this.db
      .selectDistinct({ movieId: schema.screenings.movieId })
      .from(schema.screenings)
      .where(
        and(
          gte(schema.screenings.date, startDay),
          lte(schema.screenings.date, endDay),
          inArray(schema.screenings.movieId, retroMovieIds),
        ),
      )
      .orderBy(schema.screenings.movieId);

    if (candidateMovies.length === 0) return null;

    const chosenIndex = randomInt(0, candidateMovies.length);
    const chosenMovieId = candidateMovies[chosenIndex]!.movieId;

    const movie = await this.db.query.movies.findFirst({
      where: eq(schema.movies.id, chosenMovieId),
      with: {
        movies_genres: { with: { genre: true } },
        screenings: {
          where: and(
            gte(schema.screenings.date, startDay),
            lte(schema.screenings.date, endDay),
          ),
          with: {
            cinema: true,
            showtime: { with: { city: true } },
          },
        },
      },
    });

    if (!movie) return null;

    const { screenings, ...movieData } = movie;
    return {
      movie: movieData,
      screenings: screenings.map(({ cinema, ...s }) => ({
        ...s,
        startTime: s.date,
        cinemaName: cinema?.name ?? '',
        cityName: s.showtime?.city?.name ?? '',
      })),
    };
  }
}
