import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { City } from './cities.types';
import type { CreateCityDto } from './dto/create-city.dto';
import { eq } from 'drizzle-orm';

/**
 * Service for city-related business logic and persistence.
 */
@Injectable()
export class CitiesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns all cities from the database.
   */
  getCities(): Promise<City[]> {
    return this.db.query.cities.findMany();
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
}
