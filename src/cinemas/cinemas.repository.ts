import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { asc, eq, ilike, inArray, sql } from 'drizzle-orm';
import type { Cinema } from '../database/schemas/cinemas.schema';
import { sortAndChunk } from '../lib/chunked-upsert';
import { withDeadlockRetry } from '../lib/with-deadlock-retry';
import { cinemaSlug, toSlug, uniqueSlug } from '../lib/slug';
import { excludedChanged } from '../lib/upsert';
import type { CreateCinemasBatchItemDto } from './dto/create-cinemas-batch.dto';
import type { UpdateCinemaDto } from './dto/update-cinema.dto';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class CinemasRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  // === READ ===

  async findAll(sourceCityId?: number, limit?: number) {
    return this.db.query.cinemas.findMany({
      where: sourceCityId
        ? eq(schema.cinemas.sourceCityId, sourceCityId)
        : undefined,
      with: { city: true },
      limit: limit || undefined,
    });
  }

  async findBySlug(slug: string) {
    return this.db.query.cinemas.findFirst({
      where: eq(schema.cinemas.slug, slug),
      with: { city: true },
    });
  }

  /**
   * Returns the effective content `updatedAt` per cinema (keyed by sourceId):
   * max(cinema.updatedAt, newest screening.updatedAt in that cinema).
   */
  async findContentUpdatedAt(sourceIds: number[]): Promise<Map<number, Date>> {
    if (sourceIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        sourceId: schema.cinemas.sourceId,
        updatedAt:
          sql<Date>`GREATEST(${schema.cinemas.updatedAt}, max(${schema.screenings.updatedAt}))`.mapWith(
            schema.cinemas.updatedAt,
          ),
      })
      .from(schema.cinemas)
      .leftJoin(
        schema.screenings,
        eq(schema.screenings.cinemaId, schema.cinemas.sourceId),
      )
      .where(inArray(schema.cinemas.sourceId, sourceIds))
      .groupBy(schema.cinemas.id);

    return new Map(rows.map((r) => [r.sourceId, r.updatedAt]));
  }

  /**
   * Returns the effective content `updatedAt` per city (keyed by sourceCityId):
   * max over the city's cinemas and their screenings.
   */
  async findCityContentUpdatedAt(
    sourceCityIds: number[],
  ): Promise<Map<number, Date>> {
    if (sourceCityIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        sourceCityId: schema.cinemas.sourceCityId,
        updatedAt:
          sql<Date>`GREATEST(max(${schema.cinemas.updatedAt}), max(${schema.screenings.updatedAt}))`.mapWith(
            schema.cinemas.updatedAt,
          ),
      })
      .from(schema.cinemas)
      .leftJoin(
        schema.screenings,
        eq(schema.screenings.cinemaId, schema.cinemas.sourceId),
      )
      .where(inArray(schema.cinemas.sourceCityId, sourceCityIds))
      .groupBy(schema.cinemas.sourceCityId);

    return new Map(rows.map((r) => [r.sourceCityId, r.updatedAt]));
  }

  async searchByName(query: string, limit: number) {
    return this.db.query.cinemas.findMany({
      where: ilike(schema.cinemas.name, `%${query}%`),
      with: { city: true },
      orderBy: asc(schema.cinemas.name),
      limit,
    });
  }

  // === WRITE ===

  async upsertBatch(cinemas: CreateCinemasBatchItemDto[]): Promise<void> {
    if (cinemas.length === 0) return;

    const taken = await this.findExistingSlugs();
    const cityNames = await this.findCityNames([
      ...new Set(cinemas.map((c) => c.sourceCityId)),
    ]);

    const values = cinemas.map((c) => {
      const cityName = cityNames.get(c.sourceCityId);
      const base = cityName ? cinemaSlug(c.name, cityName) : toSlug(c.name);
      const slug = uniqueSlug(base, taken);
      taken.add(slug);
      return { ...c, slug };
    });

    const chunks = sortAndChunk(values, (c) => c.sourceId);
    for (const chunk of chunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.cinemas)
            .values(chunk)
            .onConflictDoUpdate({
              target: schema.cinemas.sourceId,
              set: {
                name: sql`excluded."name"`,
                url: sql`excluded."url"`,
                sourceCityId: sql`excluded."sourceCityId"`,
                longitude: sql`excluded."longitude"`,
                latitude: sql`excluded."latitude"`,
                street: sql`excluded."street"`,
                updatedAt: sql`now()`,
              },
              setWhere: excludedChanged([
                schema.cinemas.name,
                schema.cinemas.url,
                schema.cinemas.sourceCityId,
                schema.cinemas.longitude,
                schema.cinemas.latitude,
                schema.cinemas.street,
              ]),
            }),
        { label: 'createCinemasBatch' },
      );
    }
  }

  async updateBySlug(
    slug: string,
    data: UpdateCinemaDto,
  ): Promise<Cinema | null> {
    const condition = eq(schema.cinemas.slug, slug);

    await this.db
      .update(schema.cinemas)
      .set({ ...data, updatedAt: new Date() })
      .where(condition);

    const cinema = await this.db.query.cinemas.findFirst({
      where: condition,
      with: { city: true },
    });
    return cinema ?? null;
  }

  // === PRIVATE ===

  private async findExistingSlugs(): Promise<Set<string>> {
    const rows = await this.db
      .select({ slug: schema.cinemas.slug })
      .from(schema.cinemas);
    return new Set(rows.map((r) => r.slug));
  }

  private async findCityNames(
    sourceCityIds: number[],
  ): Promise<Map<number, string>> {
    if (sourceCityIds.length === 0) return new Map();

    const rows = await this.db.query.cities.findMany({
      where: inArray(schema.cities.sourceId, sourceCityIds),
      columns: { sourceId: true, name: true },
    });
    return new Map(rows.map((r) => [r.sourceId, r.name]));
  }
}
