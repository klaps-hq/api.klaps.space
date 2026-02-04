import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schema/schema';
import { DRIZZLE } from '../database/constants';
import type { City } from './cities.types';

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
}
