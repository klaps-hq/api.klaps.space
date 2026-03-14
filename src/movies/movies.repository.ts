import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type { GetMultiCityMoviesParams } from './movies.types';
import type {
  CreateMoviesBatchItemDto,
  ActorInsertDto,
} from './dto/create-movies-batch.dto';
import { and, desc, eq, gte, inArray, like, sql } from 'drizzle-orm';
import { movieSlug, toSlug, uniqueSlug } from '../lib/slug';
import { sortAndChunk } from '../lib/chunked-upsert';
import { withDeadlockRetry } from '../lib/with-deadlock-retry';
import { MULTI_CITY } from './movies.constants';

type FullSchema = typeof schema & typeof relations;

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
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  // === READ ===

  async findAll(params?: {
    search?: string;
    genreId?: number;
    limit?: number;
    offset?: number;
  }) {
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
      limit: params?.limit,
      offset: params?.offset,
    });
  }

  async count(params?: { search?: string; genreId?: number }) {
    const where = and(
      params?.search
        ? like(schema.movies.title, `%${params.search}%`)
        : undefined,
      this.buildGenreCondition(params?.genreId),
    );

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(schema.movies)
      .where(where);
    return result.count;
  }

  async findBySlug(slug: string) {
    return this.db.query.movies.findFirst({
      where: eq(schema.movies.slug, slug),
      with: MOVIE_RELATIONS,
    });
  }

  async findMultiCityMovies(params?: GetMultiCityMoviesParams) {
    const limit = params?.limit ?? MULTI_CITY.DEFAULT_LIMIT;
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
      .where(gte(schema.screenings.date, sql`CURRENT_DATE`))
      .groupBy(
        schema.movies.id,
        schema.movies.slug,
        schema.movies.title,
        schema.movies.productionYear,
        schema.movies.posterUrl,
        schema.movies.description,
        schema.movies.duration,
      )
      .having(gte(citiesCount, MULTI_CITY.MIN_CITIES))
      .orderBy(desc(citiesCount))
      .limit(limit);
  }

  // === WRITE ===

  async upsertBatch(movies: CreateMoviesBatchItemDto[]): Promise<void> {
    if (movies.length === 0) return;

    await this.upsertMovies(movies);

    const movieIdMap = await this.findIdsBySourceIds(
      movies.map((m) => m.sourceId),
    );

    await Promise.all([
      this.upsertPersons(
        movies,
        movieIdMap,
        'actors',
        'movies_actors',
        'actorId',
      ),
      this.upsertPersons(
        movies,
        movieIdMap,
        'directors',
        'movies_directors',
        'directorId',
      ),
      this.upsertPersons(
        movies,
        movieIdMap,
        'scriptwriters',
        'movies_scriptwriters',
        'scriptwriterId',
      ),
      this.upsertCountries(movies, movieIdMap),
      this.upsertGenres(movies, movieIdMap),
    ]);
  }

  // === PRIVATE ===

  private async upsertMovies(
    movies: CreateMoviesBatchItemDto[],
  ): Promise<void> {
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
            .onConflictDoUpdate({
              target: schema.movies.sourceId,
              set: {
                url: sql`excluded."url"`,
                title: sql`excluded."title"`,
                titleOriginal: sql`excluded."titleOriginal"`,
                description: sql`excluded."description"`,
                productionYear: sql`excluded."productionYear"`,
                worldPremiereDate: sql`excluded."worldPremiereDate"`,
                polishPremiereDate: sql`excluded."polishPremiereDate"`,
                usersRating: sql`excluded."usersRating"`,
                usersRatingVotes: sql`excluded."usersRatingVotes"`,
                criticsRating: sql`excluded."criticsRating"`,
                criticsRatingVotes: sql`excluded."criticsRatingVotes"`,
                language: sql`excluded."language"`,
                duration: sql`excluded."duration"`,
                posterUrl: sql`excluded."posterUrl"`,
                backdropUrl: sql`excluded."backdropUrl"`,
                videoUrl: sql`excluded."videoUrl"`,
                boxoffice: sql`excluded."boxoffice"`,
                budget: sql`excluded."budget"`,
                distribution: sql`excluded."distribution"`,
              },
            }),
        { label: 'createBatch:movies' },
      );
    }
  }

  private async findIdsBySourceIds(
    sourceIds: number[],
  ): Promise<Map<number, number>> {
    const rows = await this.db
      .select({ id: schema.movies.id, sourceId: schema.movies.sourceId })
      .from(schema.movies)
      .where(inArray(schema.movies.sourceId, sourceIds));
    return new Map(rows.map((r) => [r.sourceId, r.id]));
  }

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

  private async upsertPersons(
    movies: CreateMoviesBatchItemDto[],
    movieIdMap: Map<number, number>,
    personKey: 'actors' | 'directors' | 'scriptwriters',
    junctionKey: 'movies_actors' | 'movies_directors' | 'movies_scriptwriters',
    fkName: 'actorId' | 'directorId' | 'scriptwriterId',
  ): Promise<void> {
    const personMap = new Map<number, ActorInsertDto>();
    const junctionPairs: { movieSourceId: number; personSourceId: number }[] =
      [];

    for (const movie of movies) {
      const persons = movie[personKey];
      if (!persons?.length) continue;
      for (const person of persons) {
        personMap.set(person.sourceId, person);
        junctionPairs.push({
          movieSourceId: movie.sourceId,
          personSourceId: person.sourceId,
        });
      }
    }

    if (personMap.size === 0) return;

    const entityTable = schema[personKey];
    const personChunks = sortAndChunk(
      [...personMap.values()],
      (p) => p.sourceId,
    );

    for (const chunk of personChunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(entityTable)
            .values(chunk)
            .onConflictDoUpdate({
              target: entityTable.sourceId,
              set: {
                name: sql`excluded."name"`,
                url: sql`excluded."url"`,
              },
            }),
        { label: `createBatch:${personKey}` },
      );
    }

    const personRows = await this.db
      .select({ id: entityTable.id, sourceId: entityTable.sourceId })
      .from(entityTable)
      .where(inArray(entityTable.sourceId, [...personMap.keys()]));
    const personIdMap = new Map(personRows.map((r) => [r.sourceId, r.id]));

    const junctionTable = schema[junctionKey];
    const junctionValues = junctionPairs
      .map((pair) => ({
        movieId: movieIdMap.get(pair.movieSourceId)!,
        [fkName]: personIdMap.get(pair.personSourceId)!,
      }))
      .filter((v) => v.movieId != null && v[fkName] != null);

    if (junctionValues.length === 0) return;

    const junctionChunks = sortAndChunk(junctionValues, (v) => v.movieId);
    for (const chunk of junctionChunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(junctionTable)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            .values(chunk as any)
            .onConflictDoUpdate({
              target: [junctionTable.movieId, (junctionTable as any)[fkName]],
              set: { movieId: sql`excluded."movieId"` },
            }),
        { label: `createBatch:${junctionKey}` },
      );
    }
  }

  private async upsertCountries(
    movies: CreateMoviesBatchItemDto[],
    movieIdMap: Map<number, number>,
  ): Promise<void> {
    const countryMap = new Map<string, { name: string; countryCode: string }>();
    const junctionPairs: { movieSourceId: number; countryCode: string }[] = [];

    for (const movie of movies) {
      if (!movie.countries?.length) continue;
      for (const country of movie.countries) {
        countryMap.set(country.countryCode, country);
        junctionPairs.push({
          movieSourceId: movie.sourceId,
          countryCode: country.countryCode,
        });
      }
    }

    if (countryMap.size === 0) return;

    const countryChunks = sortAndChunk(
      [...countryMap.values()],
      (c) => c.countryCode,
    );

    for (const chunk of countryChunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.countries)
            .values(chunk)
            .onConflictDoUpdate({
              target: schema.countries.countryCode,
              set: { name: sql`excluded."name"` },
            }),
        { label: 'createBatch:countries' },
      );
    }

    const countryRows = await this.db
      .select({
        id: schema.countries.id,
        countryCode: schema.countries.countryCode,
      })
      .from(schema.countries)
      .where(inArray(schema.countries.countryCode, [...countryMap.keys()]));
    const countryIdMap = new Map(countryRows.map((r) => [r.countryCode, r.id]));

    const junctionValues = junctionPairs
      .map((pair) => ({
        movieId: movieIdMap.get(pair.movieSourceId)!,
        countryId: countryIdMap.get(pair.countryCode)!,
      }))
      .filter((v) => v.movieId != null && v.countryId != null);

    if (junctionValues.length === 0) return;

    const junctionChunks = sortAndChunk(junctionValues, (v) => v.movieId);
    for (const chunk of junctionChunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.movies_countries)
            .values(chunk)
            .onConflictDoUpdate({
              target: [
                schema.movies_countries.movieId,
                schema.movies_countries.countryId,
              ],
              set: {
                movieId: sql`excluded."movieId"`,
              },
            }),
        { label: 'createBatch:movies_countries' },
      );
    }
  }

  private async upsertGenres(
    movies: CreateMoviesBatchItemDto[],
    movieIdMap: Map<number, number>,
  ): Promise<void> {
    const genreMap = new Map<number, { sourceId: number; name: string }>();
    const junctionPairs: { movieSourceId: number; genreSourceId: number }[] =
      [];

    for (const movie of movies) {
      if (!movie.genres?.length) continue;
      for (const genre of movie.genres) {
        genreMap.set(genre.sourceId, genre);
        junctionPairs.push({
          movieSourceId: movie.sourceId,
          genreSourceId: genre.sourceId,
        });
      }
    }

    if (genreMap.size === 0) return;

    const existingSlugs = await this.db
      .select({ slug: schema.genres.slug })
      .from(schema.genres);
    const taken = new Set(existingSlugs.map((r) => r.slug));

    const genreValues = [...genreMap.values()].map((g) => {
      const slug = uniqueSlug(toSlug(g.name), taken);
      taken.add(slug);
      return { sourceId: g.sourceId, name: g.name, slug };
    });

    const genreChunks = sortAndChunk(genreValues, (g) => g.sourceId);
    for (const chunk of genreChunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.genres)
            .values(chunk)
            .onConflictDoUpdate({
              target: schema.genres.sourceId,
              set: {
                name: sql`excluded."name"`,
                slug: sql`excluded."slug"`,
              },
            }),
        { label: 'createBatch:genres' },
      );
    }

    const genreRows = await this.db
      .select({ id: schema.genres.id, sourceId: schema.genres.sourceId })
      .from(schema.genres)
      .where(inArray(schema.genres.sourceId, [...genreMap.keys()]));
    const genreIdMap = new Map(genreRows.map((r) => [r.sourceId, r.id]));

    const junctionValues = junctionPairs
      .map((pair) => ({
        movieId: movieIdMap.get(pair.movieSourceId)!,
        genreId: genreIdMap.get(pair.genreSourceId)!,
      }))
      .filter((v) => v.movieId != null && v.genreId != null);

    if (junctionValues.length === 0) return;

    const junctionChunks = sortAndChunk(junctionValues, (v) => v.movieId);
    for (const chunk of junctionChunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.movies_genres)
            .values(chunk)
            .onConflictDoUpdate({
              target: [
                schema.movies_genres.movieId,
                schema.movies_genres.genreId,
              ],
              set: {
                movieId: sql`excluded."movieId"`,
              },
            }),
        { label: 'createBatch:movies_genres' },
      );
    }
  }
}
