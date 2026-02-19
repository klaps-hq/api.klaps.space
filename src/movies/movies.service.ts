import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type {
  GetMoviesParams,
  GetMultiCityMoviesParams,
  Movie,
} from './movies.types';
import type {
  CreateMovieDto,
  ActorInsertDto,
  CountryInsertDto,
  GenreInsertDto,
} from './dto/create-movie.dto';
import type {
  MovieSummaryResponse,
  MovieResponse,
  MultiCityMovieResponse,
  PaginatedResponse,
} from '../lib/response-types';
import { mapMovieSummary, mapMovieDetail } from '../lib/response-mappers';
import { and, count, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm';

type FullSchema = typeof schema & typeof relations;

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
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  /**
   * Returns a paginated list of all movies mapped to MovieSummaryResponse.
   */
  async getMovies(
    params?: GetMoviesParams,
  ): Promise<PaginatedResponse<MovieSummaryResponse>> {
    const page = params?.page ?? DEFAULT_PAGE;
    const limit = params?.limit ?? DEFAULT_MOVIES_LIMIT;
    const offset = (page - 1) * limit;

    const searchCondition = params?.search
      ? like(schema.movies.title, `%${params.search}%`)
      : undefined;

    const genreCondition = params?.genreId
      ? inArray(
          schema.movies.id,
          this.db
            .select({ movieId: schema.movies_genres.movieId })
            .from(schema.movies_genres)
            .where(eq(schema.movies_genres.genreId, params.genreId)),
        )
      : undefined;

    const whereConditions = and(searchCondition, genreCondition);

    const [totalResult, data] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(schema.movies)
        .where(whereConditions),
      this.db.query.movies.findMany({
        where: whereConditions,
        limit,
        offset,
        orderBy: desc(schema.movies.id),
        with: {
          movies_genres: {
            with: {
              genre: true,
            },
          },
          movies_actors: {
            with: {
              actor: true,
            },
          },
          movies_directors: {
            with: {
              director: true,
            },
          },
          movies_scriptwriters: {
            with: {
              scriptwriter: true,
            },
          },
          movies_countries: {
            with: {
              country: true,
            },
          },
        },
      }),
    ]);
    const total = totalResult[0]?.total ?? 0;
    return {
      data: data.map(mapMovieSummary),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns a single movie by id mapped to full MovieResponse.
   */
  async getMovieById(id: number): Promise<MovieResponse | null> {
    const movie = await this.db.query.movies.findFirst({
      where: eq(schema.movies.id, id),
      with: {
        movies_genres: {
          with: { genre: true },
        },
        movies_actors: {
          with: { actor: true },
        },
        movies_directors: {
          with: { director: true },
        },
        movies_scriptwriters: {
          with: { scriptwriter: true },
        },
        movies_countries: {
          with: { country: true },
        },
      },
    });

    if (!movie) return null;
    return mapMovieDetail(movie);
  }

  /**
   * Returns movies shown in the most unique cities based on upcoming screenings.
   * Filters only future screenings, groups by movie, and counts distinct cities.
   */
  async getMultiCityMovies(
    params?: GetMultiCityMoviesParams,
  ): Promise<MultiCityMovieResponse[]> {
    const limit = params?.limit ?? DEFAULT_MULTI_CITY_LIMIT;
    const citiesCountExpression =
      sql<number>`COUNT(DISTINCT ${schema.cities.id})`.mapWith(Number);
    return this.db
      .select({
        id: schema.movies.id,
        title: schema.movies.title,
        productionYear: schema.movies.productionYear,
        posterUrl: schema.movies.posterUrl,
        description: schema.movies.description,
        duration: schema.movies.duration,
        citiesCount: citiesCountExpression,
      })
      .from(schema.screenings)
      .innerJoin(schema.movies, eq(schema.screenings.movieId, schema.movies.id))
      .innerJoin(
        schema.cinemas,
        eq(schema.screenings.cinemaId, schema.cinemas.sourceId),
      )
      .innerJoin(
        schema.cities,
        eq(schema.cinemas.sourceCityId, schema.cities.sourceId),
      )
      .where(gte(schema.screenings.date, sql`CURDATE()`))
      .groupBy(
        schema.movies.id,
        schema.movies.title,
        schema.movies.productionYear,
        schema.movies.posterUrl,
        schema.movies.description,
        schema.movies.duration,
      )
      .having(gte(citiesCountExpression, DEFAULT_MIN_CITIES))
      .orderBy(desc(citiesCountExpression))
      .limit(limit);
  }

  /**
   * Creates or updates a movie (upserts on duplicate sourceId) and returns the row.
   * Also upserts related actors, directors, scriptwriters, countries, genres
   * and creates the corresponding junction table entries.
   */
  async createMovie(dto: CreateMovieDto): Promise<Movie> {
    const {
      actors,
      directors,
      scriptwriters,
      countries,
      genres,
      ...movieFields
    } = dto;

    const values = {
      ...movieFields,
      worldPremiereDate: movieFields.worldPremiereDate
        ? new Date(movieFields.worldPremiereDate)
        : undefined,
      polishPremiereDate: movieFields.polishPremiereDate
        ? new Date(movieFields.polishPremiereDate)
        : undefined,
    };

    await this.db
      .insert(schema.movies)
      .values(values)
      .onDuplicateKeyUpdate({
        set: {
          url: movieFields.url,
          title: movieFields.title,
          titleOriginal: movieFields.titleOriginal,
          description: movieFields.description,
          productionYear: movieFields.productionYear,
          worldPremiereDate: values.worldPremiereDate,
          polishPremiereDate: values.polishPremiereDate,
          usersRating: movieFields.usersRating,
          usersRatingVotes: movieFields.usersRatingVotes,
          criticsRating: movieFields.criticsRating,
          criticsRatingVotes: movieFields.criticsRatingVotes,
          language: movieFields?.language ?? null,
          duration: movieFields.duration,
          posterUrl: movieFields.posterUrl,
          backdropUrl: movieFields.backdropUrl,
          videoUrl: movieFields.videoUrl,
          boxoffice: movieFields.boxoffice,
          budget: movieFields.budget,
          distribution: movieFields.distribution,
        },
      });

    const movie = await this.db.query.movies.findFirst({
      where: eq(schema.movies.sourceId, movieFields.sourceId),
    });

    const movieId = movie!.id;

    await Promise.all([
      this.upsertActors(movieId, actors),
      this.upsertDirectors(movieId, directors),
      this.upsertScriptwriters(movieId, scriptwriters),
      this.upsertCountries(movieId, countries),
      this.upsertGenres(movieId, genres),
    ]);

    return movie!;
  }

  /**
   * Upserts actors and links them to the movie via movies_actors.
   */
  private async upsertActors(
    movieId: number,
    actors?: ActorInsertDto[],
  ): Promise<void> {
    if (!actors?.length) return;

    for (const actor of actors) {
      await this.db
        .insert(schema.actors)
        .values({
          sourceId: actor.sourceId,
          name: actor.name,
          url: actor.url,
        })
        .onDuplicateKeyUpdate({
          set: { name: actor.name, url: actor.url },
        });

      const row = await this.db.query.actors.findFirst({
        where: eq(schema.actors.sourceId, actor.sourceId),
      });

      if (!row) continue;

      await this.db
        .insert(schema.movies_actors)
        .values({ movieId, actorId: row.id })
        .onDuplicateKeyUpdate({ set: { movieId } });
    }
  }

  /**
   * Upserts directors and links them to the movie via movies_directors.
   */
  private async upsertDirectors(
    movieId: number,
    directors?: ActorInsertDto[],
  ): Promise<void> {
    if (!directors?.length) return;

    for (const director of directors) {
      await this.db
        .insert(schema.directors)
        .values({
          sourceId: director.sourceId,
          name: director.name,
          url: director.url,
        })
        .onDuplicateKeyUpdate({
          set: { name: director.name, url: director.url },
        });

      const row = await this.db.query.directors.findFirst({
        where: eq(schema.directors.sourceId, director.sourceId),
      });

      if (!row) continue;

      await this.db
        .insert(schema.movies_directors)
        .values({ movieId, directorId: row.id })
        .onDuplicateKeyUpdate({ set: { movieId } });
    }
  }

  /**
   * Upserts scriptwriters and links them to the movie via movies_scriptwriters.
   */
  private async upsertScriptwriters(
    movieId: number,
    scriptwriters?: ActorInsertDto[],
  ): Promise<void> {
    if (!scriptwriters?.length) return;

    for (const sw of scriptwriters) {
      await this.db
        .insert(schema.scriptwriters)
        .values({
          sourceId: sw.sourceId,
          name: sw.name,
          url: sw.url,
        })
        .onDuplicateKeyUpdate({
          set: { name: sw.name, url: sw.url },
        });

      const row = await this.db.query.scriptwriters.findFirst({
        where: eq(schema.scriptwriters.sourceId, sw.sourceId),
      });

      if (!row) continue;

      await this.db
        .insert(schema.movies_scriptwriters)
        .values({ movieId, scriptwriterId: row.id })
        .onDuplicateKeyUpdate({ set: { movieId } });
    }
  }

  /**
   * Upserts countries and links them to the movie via movies_countries.
   */
  private async upsertCountries(
    movieId: number,
    countries?: CountryInsertDto[],
  ): Promise<void> {
    if (!countries?.length) return;

    for (const country of countries) {
      await this.db
        .insert(schema.countries)
        .values({
          name: country.name,
          countryCode: country.countryCode,
        })
        .onDuplicateKeyUpdate({
          set: { name: country.name },
        });

      const row = await this.db.query.countries.findFirst({
        where: eq(schema.countries.countryCode, country.countryCode),
      });

      if (!row) continue;

      await this.db
        .insert(schema.movies_countries)
        .values({ movieId, countryId: row.id })
        .onDuplicateKeyUpdate({ set: { movieId } });
    }
  }

  /**
   * Upserts genres and links them to the movie via movies_genres.
   */
  private async upsertGenres(
    movieId: number,
    genres?: GenreInsertDto[],
  ): Promise<void> {
    if (!genres?.length) return;

    for (const genre of genres) {
      await this.db
        .insert(schema.genres)
        .values({
          sourceId: genre.sourceId,
          name: genre.name,
        })
        .onDuplicateKeyUpdate({
          set: { name: genre.name },
        });

      const row = await this.db.query.genres.findFirst({
        where: eq(schema.genres.sourceId, genre.sourceId),
      });

      if (!row) continue;

      await this.db
        .insert(schema.movies_genres)
        .values({ movieId, genreId: row.id })
        .onDuplicateKeyUpdate({ set: { movieId } });
    }
  }
}
