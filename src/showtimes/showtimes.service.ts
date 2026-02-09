import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { Showtime } from './showtimes.types';
import type { CreateShowtimeDto } from './dto/create-showtime.dto';
import type { MarkCityProcessedDto } from './dto/mark-city-processed.dto';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getDatePlusMonth, getTodayInPoland } from '../lib/utils';

/**
 * Service for showtime-related business logic and persistence.
 */
@Injectable()
export class ShowtimesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns all showtimes from the database.
   */
  getShowtimes(): Promise<Showtime[]> {
    return this.db.query.showtimes.findMany();
  }

  /**
   * Creates or updates a showtime (upserts on duplicate url) and returns the row.
   */
  async createShowtime(dto: CreateShowtimeDto): Promise<Showtime> {
    await this.db
      .insert(schema.showtimes)
      .values({ ...dto, date: new Date(dto.date) })
      .onDuplicateKeyUpdate({
        set: {
          cityId: dto.cityId,
          url: dto.url,
          date: new Date(dto.date),
        },
      });
    const showtime = await this.db.query.showtimes.findFirst({
      where: eq(schema.showtimes.url, dto.url),
    });
    return showtime!;
  }

  /**
   * Returns distinct cityIds from processed_cities within the given date range.
   * Includes cities that had zero showtimes but were already checked by the scrapper.
   */
  async getProcessedCityIds(
    startDate: string,
    endDate: string,
  ): Promise<number[]> {
    const start = startDate ?? getTodayInPoland();
    const end = endDate ?? getDatePlusMonth(start);

    const rows = await this.db
      .selectDistinct({ cityId: schema.processed_cities.cityId })
      .from(schema.processed_cities)
      .where(
        and(
          gte(schema.processed_cities.processedAt, start),
          lte(schema.processed_cities.processedAt, end),
        ),
      );
    return rows.map((r) => r.cityId);
  }

  /**
   * Upserts a record in processed_cities for the given cityId and processedAt date.
   * Uses Europe/Warsaw timezone to determine "today" if processedAt is not provided.
   * If the record already exists, does nothing (no error).
   */
  async markCityProcessed(dto: MarkCityProcessedDto): Promise<void> {
    const processedAt = dto.processedAt ?? getTodayInPoland();

    await this.db
      .insert(schema.processed_cities)
      .values({
        cityId: dto.cityId,
        processedAt,
      })
      .onDuplicateKeyUpdate({
        set: { cityId: dto.cityId },
      });
  }
}
