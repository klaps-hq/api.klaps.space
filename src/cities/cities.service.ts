import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { City } from './cities.types';
import type {
  PostCitiesBatchCityDto,
  PostCityDto,
} from './dto/post-cities.dto';
import type { CityDetailResponse, CityResponse } from '../lib/response-types';
import { mapCity } from '../lib/response-mappers';
import { and, eq, getTableColumns, gte, lte, sql } from 'drizzle-orm';
import { ScreeningsService } from '../screenings/screenings.service';
import { sortAndChunk } from '../wrappers/chunked-upsert';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';
import { toSlug, uniqueSlug } from '../lib/slug';
import type { GetScrapedCitiesDto } from './dto/get-scraped-cities.dto';

@Injectable()
export class CitiesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly screeningsService: ScreeningsService,
  ) {}

  async getCities(): Promise<City[]> {
    return this.db.query.cities.findMany();
  }

  async getCitiesWithCinemas(): Promise<CityResponse[]> {
    const cityColumns = getTableColumns(schema.cities);

    const cities = await this.db
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

    return cities.map((c) => mapCity(c, c.numberOfCinemas));
  }

  async getCityByIdOrSlug(
    idOrSlug: string,
  ): Promise<CityDetailResponse | null> {
    const numericId = Number(idOrSlug);
    const isId = Number.isInteger(numericId) && numericId > 0;

    const city = await this.db.query.cities.findFirst({
      where: isId
        ? eq(schema.cities.id, numericId)
        : eq(schema.cities.slug, idOrSlug),
    });

    if (!city) return null;

    const screenings = await this.screeningsService.getScreenings({
      cityId: city.id,
    });

    const [{ count: numberOfCinemas }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.cinemas)
      .where(eq(schema.cinemas.sourceCityId, city.sourceId));

    return {
      city: mapCity(city, numberOfCinemas),
      screenings,
    };
  }

  async updateCityByIdOrSlug(
    idOrSlug: string,
    data: PostCityDto,
  ): Promise<City> {
    const numericId = Number(idOrSlug);
    const isId = Number.isInteger(numericId) && numericId > 0;
    const condition = isId
      ? eq(schema.cities.id, numericId)
      : eq(schema.cities.slug, idOrSlug);

    await this.db.update(schema.cities).set(data).where(condition);

    const city = await this.db.query.cities.findFirst({ where: condition });
    if (!city) throw new NotFoundException(`City "${idOrSlug}" not found`);
    return city;
  }

  // Upsert cities with chunked inserts and deadlock retry.
  async createCitiesBatch(cities: PostCitiesBatchCityDto[]): Promise<void> {
    if (cities.length === 0) return;

    const existingSlugs = await this.db
      .select({ slug: schema.cities.slug })
      .from(schema.cities);
    const taken = new Set(existingSlugs.map((r) => r.slug));

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
            .onDuplicateKeyUpdate({
              set: {
                name: sql`VALUES(${schema.cities.name})`,
                nameDeclinated: sql`VALUES(${schema.cities.nameDeclinated})`,
                areacode: sql`VALUES(${schema.cities.areacode})`,
              },
            }),
        { label: 'createCitiesBatch' },
      );
    }
  }

  // Get city IDs that were scraped within a date range.
  async getScrapedCities(query: GetScrapedCitiesDto): Promise<number[]> {
    const { dateFrom, dateTo, cityId, citySlug } = query;
    const startDay = dateFrom ? new Date(dateFrom) : new Date();
    const endDay = dateTo ? new Date(dateTo) : new Date();

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
}
