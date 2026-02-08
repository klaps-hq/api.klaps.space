import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schema/schema';
import { DRIZZLE } from '../database/constants';
import type {
  GetMoviesParams,
  GetMultiCityMoviesParams,
  MovieWithGenres,
  MultiCityMovie,
  PaginatedMoviesResponse,
} from './movies.types';
import { count, desc, eq, gte, lte, sql } from 'drizzle-orm';

const DEFAULT_PAGE = 1;
const DEFAULT_MOVIES_LIMIT = 20;
const DEFAULT_MULTI_CITY_LIMIT = 5;
const DEFAULT_MIN_CITIES = 2;

/**
 * Service for movie-related business logic and persistence.
 */
@Injectable()
export class MoviesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns a paginated list of all movies with their genres.
   */
  async getMovies(params?: GetMoviesParams): Promise<PaginatedMoviesResponse> {
    const page = params?.page ?? DEFAULT_PAGE;
    const limit = params?.limit ?? DEFAULT_MOVIES_LIMIT;
    const offset = (page - 1) * limit;
    const [totalResult, data] = await Promise.all([
      this.db.select({ total: count() }).from(schema.movies),
      this.db.query.movies.findMany({
        limit,
        offset,
        orderBy: desc(schema.movies.id),
        with: {
          movies_genres: {
            with: {
              genre: true,
            },
          },
        },
      }),
    ]);
    const total = totalResult[0]?.total ?? 0;
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns a single movie by id with its genres.
   */
  async getMovieById(id: number): Promise<MovieWithGenres | null> {
    const movie = await this.db.query.movies.findFirst({
      where: eq(schema.movies.id, id),
      with: {
        movies_genres: {
          with: {
            genre: true,
          },
        },
      },
    });
    return movie ?? null;
  }

  /**
   * Returns movies shown in the most unique cities based on upcoming screenings.
   * Filters only future screenings, groups by movie, and counts distinct cities.
   */
  async getMultiCityMovies(
    params?: GetMultiCityMoviesParams,
  ): Promise<MultiCityMovie[]> {
    const limit = params?.limit ?? DEFAULT_MULTI_CITY_LIMIT;
    const minCities = params?.minCities ?? DEFAULT_MIN_CITIES;
    const citiesCountExpression =
      sql<number>`COUNT(DISTINCT ${schema.cities.id})`.mapWith(Number);
    return this.db
      .select({
        id: schema.movies.id,
        title: schema.movies.title,
        year: schema.movies.productionYear,
        posterUrl: schema.movies.posterUrl,
        citiesCount: citiesCountExpression,
      })
      .from(schema.screenings)
      .innerJoin(schema.movies, eq(schema.screenings.movieId, schema.movies.id))
      .innerJoin(
        schema.cinemas,
        eq(schema.screenings.cinemaId, schema.cinemas.filmwebId),
      )
      .innerJoin(
        schema.cities,
        eq(schema.cinemas.filmwebCityId, schema.cities.filmwebId),
      )
      .where(gte(schema.screenings.date, sql`NOW()`))
      .groupBy(
        schema.movies.id,
        schema.movies.title,
        schema.movies.productionYear,
        schema.movies.posterUrl,
      )
      .having(sql`COUNT(DISTINCT ${schema.cities.id}) >= ${minCities}`)
      .orderBy(desc(citiesCountExpression))
      .limit(limit);
  }
}
