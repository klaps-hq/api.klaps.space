import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { and, eq, getTableColumns, gte, lte, sql } from 'drizzle-orm';
import { sortAndChunk } from '../lib/chunked-upsert';
import { withDeadlockRetry } from '../lib/with-deadlock-retry';
import { toSlug, uniqueSlug } from '../lib/slug';
import type { City } from './cities.types';
import type { CreateCitiesBatchItemDto } from './dto/create-cities-batch.dto';
import type { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CitiesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === READ ===

  async findAll(): Promise<City[]> {
    return this.db.query.cities.findMany();
  }

  async findWithCinemaCount() {
    const cityColumns = getTableColumns(schema.cities);

    return this.db
      .select({
        ...cityColumns,
        numberOfCinemas: sql<number>`count(${schema.cinemas.id})`,
      })
      .from(schema.cities)
      .innerJoin(
        schema.cinemas,
        eq(schema.cinemas.sourceCityId, schema.cities.sourceId),
      )
      .groupBy(...Object.values(cityColumns));
  }

  async findBySlug(slug: string) {
    return this.db.query.cities.findFirst({
      where: eq(schema.cities.slug, slug),
    });
  }

  async countCinemasBySourceId(sourceCityId: number): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.cinemas)
      .where(eq(schema.cinemas.sourceCityId, sourceCityId));
    return count;
  }

  async findScrapedCityIds(
    startDay: Date,
    endDay: Date,
    cityId?: number,
    citySlug?: string,
  ): Promise<number[]> {
    const cities = await this.db
      .select({ id: schema.cities.id })
      .from(schema.cities)
      .where(
        and(
          gte(schema.cities.lastScrapedAt, startDay),
          lte(schema.cities.lastScrapedAt, endDay),
          cityId ? eq(schema.cities.id, cityId) : undefined,
          citySlug ? eq(schema.cities.slug, citySlug) : undefined,
        ),
      );
    return cities.map((c) => c.id);
  }

  // === WRITE ===

  async upsertBatch(cities: CreateCitiesBatchItemDto[]): Promise<void> {
    if (cities.length === 0) return;

    const taken = await this.findExistingSlugs();

    const values = cities.map((c) => {
      const slug = uniqueSlug(toSlug(c.name), taken);
      taken.add(slug);
      return { ...c, slug };
    });

    const chunks = sortAndChunk(values, (c) => c.sourceId);
    for (const chunk of chunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.cities)
            .values(chunk)
            .onConflictDoUpdate({
              target: schema.cities.sourceId,
              set: {
                name: sql`excluded."name"`,
                nameDeclinated: sql`excluded."nameDeclinated"`,
                areacode: sql`excluded."areacode"`,
                population: sql`excluded."population"`,
              },
            }),
        { label: 'createCitiesBatch' },
      );
    }
  }

  async updateBySlug(slug: string, data: UpdateCityDto): Promise<City | null> {
    const condition = eq(schema.cities.slug, slug);

    await this.db.update(schema.cities).set(data).where(condition);

    const city = await this.db.query.cities.findFirst({ where: condition });
    return city ?? null;
  }

  // === PRIVATE ===

  private async findExistingSlugs(): Promise<Set<string>> {
    const rows = await this.db
      .select({ slug: schema.cities.slug })
      .from(schema.cities);
    return new Set(rows.map((r) => r.slug));
  }
}
