import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { sortAndChunk } from '../lib/chunked-upsert';
import { withDeadlockRetry } from '../lib/with-deadlock-retry';
import type { Showtime } from './showtimes.types';
import type { CreateShowtimesBatchItemDto } from './dto/create-showtimes-batch.dto';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class ShowtimesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  // === READ ===

  async findAll(
    startDay: Date,
    endDay: Date,
    cityId?: number,
  ): Promise<Showtime[]> {
    return this.db.query.showtimes.findMany({
      where: and(
        gte(schema.showtimes.createdAt, startDay),
        lte(schema.showtimes.createdAt, endDay),
        cityId ? eq(schema.showtimes.cityId, cityId) : undefined,
      ),
    });
  }

  // === WRITE ===

  async upsertBatch(showtimes: CreateShowtimesBatchItemDto[]): Promise<void> {
    const values = showtimes.map((s) => ({ ...s, date: new Date(s.date) }));
    const chunks = sortAndChunk(values, (s) => s.url);

    for (const chunk of chunks) {
      await withDeadlockRetry(
        () => this.db.insert(schema.showtimes).values(chunk),
        { label: 'createShowtimesBatch' },
      );
    }
  }

  async updateCitiesLastScrapedAt(cityIds: number[]): Promise<void> {
    const cityChunks = sortAndChunk(cityIds, (id) => id);

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
