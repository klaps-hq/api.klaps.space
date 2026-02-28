import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { City } from './cities.types';
import type { CreateCityDto } from './dto/create-city.dto';
import type { CityDetailResponse, CityResponse } from '../lib/response-types';
import { mapCity } from '../lib/response-mappers';
import { eq, like, sql } from 'drizzle-orm';
import { ScreeningsService } from '../screenings/screenings.service';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';
import { toSlug, uniqueSlug } from '../lib/slug';

/**
 * Service for city-related business logic and persistence.
 */
@Injectable()
export class CitiesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly screeningsService: ScreeningsService,
  ) {}

  /**
   * Returns all cities with at least one cinema. Returned with numberOfCinemas count.
   */
  async getCities(): Promise<CityResponse[]> {
    const rows = await this.db
      .select({
        id: schema.cities.id,
        slug: schema.cities.slug,
        name: schema.cities.name,
        nameDeclinated: schema.cities.nameDeclinated,
        numberOfCinemas: sql<number>`count(${schema.cinemas.id})`,
      })
      .from(schema.cities)
      .innerJoin(
        schema.cinemas,
        eq(schema.cinemas.sourceCityId, schema.cities.sourceId),
      )
      .groupBy(
        schema.cities.id,
        schema.cities.slug,
        schema.cities.name,
        schema.cities.nameDeclinated,
      );

    return rows.map((row) => mapCity(row, row.numberOfCinemas));
  }

  async getCityByIdOrSlug(
    idOrSlug: string,
  ): Promise<CityDetailResponse | null> {
    const numericId = Number(idOrSlug);
    const condition =
      Number.isInteger(numericId) && numericId > 0
        ? eq(schema.cities.id, numericId)
        : eq(schema.cities.slug, idOrSlug);

    const city = await this.db.query.cities.findFirst({
      where: condition,
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

  /**
   * Creates or updates a city (upserts on duplicate sourceId) and returns the row.
   */
  async createCity(dto: CreateCityDto): Promise<City> {
    const slug = await this.generateCitySlug(dto.name);

    await this.db
      .insert(schema.cities)
      .values({ ...dto, slug })
      .onDuplicateKeyUpdate({
        set: {
          slug,
          name: dto.name,
          nameDeclinated: dto.nameDeclinated,
          areacode: dto.areacode,
        },
      });
    const city = await this.db.query.cities.findFirst({
      where: eq(schema.cities.sourceId, dto.sourceId),
    });
    return city!;
  }

  /**
   * Bulk upserts cities with a single multi-row INSERT.
   * Automatically retries on deadlock via withDeadlockRetry wrapper.
   */
  async batchCreateCities(cities: CreateCityDto[]): Promise<{ count: number }> {
    if (cities.length === 0) return { count: 0 };

    const existingSlugs = await this.db
      .select({ slug: schema.cities.slug })
      .from(schema.cities);
    const taken = new Set(existingSlugs.map((r) => r.slug));
    const values = cities.map((c) => {
      const slug = uniqueSlug(toSlug(c.name), taken);
      taken.add(slug);
      return { ...c, slug };
    });

    await withDeadlockRetry(
      () =>
        this.db
          .insert(schema.cities)
          .values(values)
          .onDuplicateKeyUpdate({
            set: {
              name: sql`VALUES(${schema.cities.name})`,
              nameDeclinated: sql`VALUES(${schema.cities.nameDeclinated})`,
              areacode: sql`VALUES(${schema.cities.areacode})`,
            },
          }),
      { label: 'batchCreateCities' },
    );

    return { count: cities.length };
  }

  private async generateCitySlug(name: string): Promise<string> {
    const base = toSlug(name);
    const existing = await this.db
      .select({ slug: schema.cities.slug })
      .from(schema.cities)
      .where(like(schema.cities.slug, `${base}%`));
    return uniqueSlug(
      base,
      existing.map((r) => r.slug),
    );
  }
}
