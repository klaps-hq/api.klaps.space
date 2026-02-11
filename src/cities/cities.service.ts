import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { City } from './cities.types';
import type { CreateCityDto } from './dto/create-city.dto';
import type { CityDetailResponse, CityResponse } from '../lib/response-types';
import { mapCity } from '../lib/response-mappers';
import { eq, sql } from 'drizzle-orm';
import { ScreeningsService } from '../screenings/screenings.service';

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
   * Returns all cities, stripped of DB internals (filmwebId, areacode).
   */
  async getCities(): Promise<CityResponse[]> {
    const cities = await this.db.query.cities.findMany();
    return cities.map(mapCity);
  }

  async getCityById(id: number): Promise<CityDetailResponse | null> {
    const city = await this.db.query.cities.findFirst({
      where: eq(schema.cities.id, id),
    });

    if (!city) return null;

    const screenings = await this.screeningsService.getScreenings({
      cityId: id,
    });

    return {
      city: mapCity(city),
      screenings,
    };
  }

  /**
   * Creates or updates a city (upserts on duplicate filmwebId) and returns the row.
   */
  async createCity(dto: CreateCityDto): Promise<City> {
    await this.db
      .insert(schema.cities)
      .values(dto)
      .onDuplicateKeyUpdate({
        set: {
          name: dto.name,
          nameDeclinated: dto.nameDeclinated,
          areacode: dto.areacode,
        },
      });
    const city = await this.db.query.cities.findFirst({
      where: eq(schema.cities.filmwebId, dto.filmwebId),
    });
    return city!;
  }

  /**
   * Bulk upserts cities in a single transaction with one multi-row INSERT.
   */
  async batchCreateCities(cities: CreateCityDto[]): Promise<{ count: number }> {
    if (cities.length === 0) return { count: 0 };

    await this.db.transaction(async (tx) => {
      await tx
        .insert(schema.cities)
        .values(cities)
        .onDuplicateKeyUpdate({
          set: {
            name: sql`VALUES(${schema.cities.name})`,
            nameDeclinated: sql`VALUES(${schema.cities.nameDeclinated})`,
            areacode: sql`VALUES(${schema.cities.areacode})`,
          },
        });
    });

    return { count: cities.length };
  }
}
