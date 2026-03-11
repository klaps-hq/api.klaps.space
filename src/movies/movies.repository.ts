import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type { GetMultiCityMoviesParams } from './movies.types';
import { and, desc, eq, gte, inArray, like, sql } from 'drizzle-orm';
import { movieSlug, uniqueSlug } from '../lib/slug';
import { sortAndChunk } from '../wrappers/chunked-upsert';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';
import type { CreateMoviesBatchItemDto } from './dto/create-movies-batch.dto';

type FullSchema = typeof schema & typeof relations;

const DEFAULT_MULTI_CITY_LIMIT = 5;
const DEFAULT_MIN_CITIES = 2;

const MOVIE_RELATIONS = {
  movies_genres: { with: { genre: true } },
  movies_actors: { with: { actor: true } },
  movies_directors: { with: { director: true } },
  movies_scriptwriters: { with: { scriptwriter: true } },
  movies_countries: { with: { country: true } },
} as const;

@Injectable()
export class MoviesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  // === READ ===

  async findMovies(params?: { search?: string; genreId?: number }) {
    const where = and(
      params?.search
        ? like(schema.movies.title, `%${params.search}%`)
        : undefined,
      this.buildGenreCondition(params?.genreId),
    );

    return this.db.query.movies.findMany({
      where,
      orderBy: desc(schema.movies.id),
      with: MOVIE_RELATIONS,
    });
  }

  async findBySlug(slug: string) {
    return this.db.query.movies.findFirst({
      where: eq(schema.movies.slug, slug),
      with: MOVIE_RELATIONS,
    });
  }

  async findMultiCityMovies(params?: GetMultiCityMoviesParams) {
    const limit = params?.limit ?? DEFAULT_MULTI_CITY_LIMIT;
    const citiesCount =
      sql<number>`COUNT(DISTINCT ${schema.cities.id})`.mapWith(Number);

    return this.db
      .select({
        id: schema.movies.id,
        slug: schema.movies.slug,
        title: schema.movies.title,
        productionYear: schema.movies.productionYear,
        posterUrl: schema.movies.posterUrl,
        description: schema.movies.description,
        duration: schema.movies.duration,
        citiesCount,
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
        schema.movies.slug,
        schema.movies.title,
        schema.movies.productionYear,
        schema.movies.posterUrl,
        schema.movies.description,
        schema.movies.duration,
      )
      .having(gte(citiesCount, DEFAULT_MIN_CITIES))
      .orderBy(desc(citiesCount))
      .limit(limit);
  }

  // === WRITE ===

  async upsertBatch(movies: CreateMoviesBatchItemDto[]): Promise<void> {
    const taken = await this.findExistingSlugs();

    const values = movies.map((m) => {
      const slug = uniqueSlug(movieSlug(m.title, m.productionYear), taken);
      taken.add(slug);
      return {
        sourceId: m.sourceId,
        url: m.url,
        title: m.title,
        slug,
        titleOriginal: m.titleOriginal,
        description: m.description,
        productionYear: m.productionYear,
        worldPremiereDate: m.worldPremiereDate
          ? new Date(m.worldPremiereDate)
          : undefined,
        polishPremiereDate: m.polishPremiereDate
          ? new Date(m.polishPremiereDate)
          : undefined,
        usersRating: m.usersRating,
        usersRatingVotes: m.usersRatingVotes,
        criticsRating: m.criticsRating,
        criticsRatingVotes: m.criticsRatingVotes,
        language: m.language,
        duration: m.duration,
        posterUrl: m.posterUrl,
        backdropUrl: m.backdropUrl,
        videoUrl: m.videoUrl,
        boxoffice: m.boxoffice,
        budget: m.budget,
        distribution: m.distribution,
      };
    });

    const chunks = sortAndChunk(values, (m) => m.sourceId);
    for (const chunk of chunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.movies)
            .values(chunk)
            .onDuplicateKeyUpdate({
              set: {
                url: sql`VALUES(${schema.movies.url})`,
                title: sql`VALUES(${schema.movies.title})`,
                titleOriginal: sql`VALUES(${schema.movies.titleOriginal})`,
                description: sql`VALUES(${schema.movies.description})`,
                productionYear: sql`VALUES(${schema.movies.productionYear})`,
                worldPremiereDate: sql`VALUES(${schema.movies.worldPremiereDate})`,
                polishPremiereDate: sql`VALUES(${schema.movies.polishPremiereDate})`,
                usersRating: sql`VALUES(${schema.movies.usersRating})`,
                usersRatingVotes: sql`VALUES(${schema.movies.usersRatingVotes})`,
                criticsRating: sql`VALUES(${schema.movies.criticsRating})`,
                criticsRatingVotes: sql`VALUES(${schema.movies.criticsRatingVotes})`,
                language: sql`VALUES(${schema.movies.language})`,
                duration: sql`VALUES(${schema.movies.duration})`,
                posterUrl: sql`VALUES(${schema.movies.posterUrl})`,
                backdropUrl: sql`VALUES(${schema.movies.backdropUrl})`,
                videoUrl: sql`VALUES(${schema.movies.videoUrl})`,
                boxoffice: sql`VALUES(${schema.movies.boxoffice})`,
                budget: sql`VALUES(${schema.movies.budget})`,
                distribution: sql`VALUES(${schema.movies.distribution})`,
              },
            }),
        { label: 'createMoviesBatch:movies' },
      );
    }
  }

  async findIdsBySourceIds(sourceIds: number[]): Promise<Map<number, number>> {
    const rows = await this.db
      .select({ id: schema.movies.id, sourceId: schema.movies.sourceId })
      .from(schema.movies)
      .where(inArray(schema.movies.sourceId, sourceIds));
    return new Map(rows.map((r) => [r.sourceId, r.id]));
  }

  // === PRIVATE ===

  private async findExistingSlugs(): Promise<Set<string>> {
    const rows = await this.db
      .select({ slug: schema.movies.slug })
      .from(schema.movies);
    return new Set(rows.map((r) => r.slug));
  }

  private buildGenreCondition(genreId?: number) {
    if (!genreId) return undefined;

    return inArray(
      schema.movies.id,
      this.db
        .select({ movieId: schema.movies_genres.movieId })
        .from(schema.movies_genres)
        .where(eq(schema.movies_genres.genreId, genreId)),
    );
  }
}
