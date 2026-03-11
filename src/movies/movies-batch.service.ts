import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type {
  CreateMoviesBatchItemDto,
  ActorInsertDto,
} from './dto/create-movies-batch.dto';
import { inArray, sql } from 'drizzle-orm';
import { toSlug, uniqueSlug } from '../lib/slug';
import { sortAndChunk } from '../wrappers/chunked-upsert';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';
import { MoviesRepository } from './movies.repository';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class MoviesBatchService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
    private readonly moviesRepo: MoviesRepository,
  ) {}

  async createBatch(movies: CreateMoviesBatchItemDto[]): Promise<void> {
    if (movies.length === 0) return;

    await this.moviesRepo.upsertBatch(movies);

    const movieIdMap = await this.moviesRepo.findIdsBySourceIds(
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
            .onDuplicateKeyUpdate({
              set: {
                name: sql`VALUES(${entityTable.name})`,
                url: sql`VALUES(${entityTable.url})`,
              },
            }),
        { label: `createMoviesBatch:${personKey}` },
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
            .onDuplicateKeyUpdate({
              set: { movieId: sql`VALUES(${junctionTable.movieId})` },
            }),
        { label: `createMoviesBatch:${junctionKey}` },
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
            .onDuplicateKeyUpdate({
              set: { name: sql`VALUES(${schema.countries.name})` },
            }),
        { label: 'createMoviesBatch:countries' },
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
            .onDuplicateKeyUpdate({
              set: {
                movieId: sql`VALUES(${schema.movies_countries.movieId})`,
              },
            }),
        { label: 'createMoviesBatch:movies_countries' },
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
            .onDuplicateKeyUpdate({
              set: {
                name: sql`VALUES(${schema.genres.name})`,
                slug: sql`VALUES(${schema.genres.slug})`,
              },
            }),
        { label: 'createMoviesBatch:genres' },
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
            .onDuplicateKeyUpdate({
              set: {
                movieId: sql`VALUES(${schema.movies_genres.movieId})`,
              },
            }),
        { label: 'createMoviesBatch:movies_genres' },
      );
    }
  }
}
