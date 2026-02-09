import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { and, eq, inArray } from 'drizzle-orm';
import type { CinemaWithCityName, GetCinemasParams } from './cinemas.types';

type FullSchema = typeof schema & typeof relations;

const DEFAULT_CINEMA_LIMIT = 50;
const MAX_CINEMA_LIMIT = 200;

/**
 * Service for cinema-related business logic and persistence.
 */
@Injectable()
export class CinemasService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  /**
   * Returns cinemas from the database with cityName.
   * Optionally filtered by cityId with a configurable limit.
   */
  async getCinemas(params?: GetCinemasParams): Promise<CinemaWithCityName[]> {
    const limit = Math.min(
      params?.limit ?? DEFAULT_CINEMA_LIMIT,
      MAX_CINEMA_LIMIT,
    );

    const cityCondition = params?.cityId
      ? inArray(
          schema.cinemas.filmwebCityId,
          this.db
            .select({ filmwebId: schema.cities.filmwebId })
            .from(schema.cities)
            .where(eq(schema.cities.id, params.cityId)),
        )
      : undefined;

    const cinemas = await this.db.query.cinemas.findMany({
      where: cityCondition ? and(cityCondition) : undefined,
      limit,
      with: { city: true },
    });

    return cinemas.map(({ city, ...cinema }) => ({
      ...cinema,
      cityName: city?.name ?? '',
    }));
  }

  /**
   * Returns a single cinema by its database id, including city name.
   */
  async getCinemaById(id: number): Promise<CinemaWithCityName | null> {
    const cinema = await this.db.query.cinemas.findFirst({
      where: eq(schema.cinemas.id, id),
      with: { city: true },
    });
    if (!cinema) return null;
    const { city, ...rest } = cinema;
    return { ...rest, cityName: city?.name ?? '' };
  }
}
