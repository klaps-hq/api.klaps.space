import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type { Showtime } from './showtimes.types';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { sortAndChunk } from '../wrappers/chunked-upsert';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';
import { GetShowtimesQueryDto } from './dto/get-showtimes-query.dto';
import { PostShowtimesDto } from './dto/post-showtimes.dto';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class ShowtimesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  // Get showtimes by date range and city. If cityId or citySlug is provided, filter by city.
  async getShowtimes(query: GetShowtimesQueryDto): Promise<Showtime[]> {
    const { dateFrom, dateTo, cityId, citySlug } = query;
    const startDay = dateFrom ? new Date(dateFrom) : new Date();
    const endDay = dateTo ? new Date(dateTo) : new Date();

    let cityCondition;

    if (cityId) {
      cityCondition = eq(schema.showtimes.cityId, cityId);
    } else if (citySlug) {
      const cityIdBySlug = this.db
        .select({ id: schema.cities.id })
        .from(schema.cities)
        .where(eq(schema.cities.slug, citySlug));

      cityCondition = inArray(schema.showtimes.cityId, cityIdBySlug);
    }

    const showtimes = await this.db.query.showtimes.findMany({
      where: and(
        gte(schema.showtimes.createdAt, startDay),
        lte(schema.showtimes.createdAt, endDay),
        cityCondition,
      ),
    });

    return showtimes;
  }

  // Save showtimes to database and update cities last scraped at.
  async createShowtimesBatch(dto: PostShowtimesDto): Promise<void> {
    const { showtimes, scrapedCityIds } = dto;
    if (showtimes.length === 0) return;

    const values = showtimes.map((s) => ({ ...s, date: new Date(s.date) }));
    const chunks = sortAndChunk(values, (s) => s.url);

    for (const chunk of chunks) {
      await withDeadlockRetry(
        () => this.db.insert(schema.showtimes).values(chunk),
        { label: 'createShowtimesBatch' },
      );
    }

    if (scrapedCityIds && scrapedCityIds.length > 0) {
      const cityChunks = sortAndChunk(scrapedCityIds, (id) => id);

      for (const chunk of cityChunks) {
        await withDeadlockRetry(
          () =>
            this.db
              .update(schema.cities)
              .set({ lastScrapedAt: new Date() })
              .where(inArray(schema.cities.id, chunk)),
          { label: 'createShowtimesBatch:lastScrapedAt' },
        );
      }
    }
  }
}
