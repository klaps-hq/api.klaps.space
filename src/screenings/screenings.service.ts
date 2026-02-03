import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/constants';
import type {
  GetScreeningsParams,
  ScreeningWithMovieAndCinema,
} from './screenings.types';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';

/**
 * Service for screening-related business logic and persistence.
 */
@Injectable()
export class ScreeningsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns screenings for a given date (default today) and optional city.
   */
  async getScreenings(
    params?: GetScreeningsParams,
  ): Promise<ScreeningWithMovieAndCinema[]> {
    const date = params?.date ?? this.getTodayDateString();
    const cityId = params?.cityId ?? 0;

    return this.db.query.screenings.findMany({
      where: and(
        eq(schema.screenings.date, date),
        eq(schema.screenings.cinemaId, cityId),
      ),
      with: {
        movie: true,
        cinema: true,
      },
    });
  }

  private getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
