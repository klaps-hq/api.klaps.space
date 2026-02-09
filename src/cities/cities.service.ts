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
   * Creates a new city and returns the inserted row.
   */
  async createCity(dto: CreateCityDto): Promise<City> {
    const [result] = await this.db
      .insert(schema.cities)
      .values(dto)
      .$returningId();
    const city = await this.db.query.cities.findFirst({
      where: eq(schema.cities.id, result.id),
    });
    return city!;
  }
}
