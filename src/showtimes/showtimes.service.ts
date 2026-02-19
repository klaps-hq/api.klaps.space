import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type { Showtime } from './showtimes.types';
import type { CreateShowtimeDto } from './dto/create-showtime.dto';
import type { MarkCityProcessedDto } from './dto/mark-city-processed.dto';
import type { MarkShowtimeProcessedDto } from './dto/mark-showtime-processed.dto';
import type { ProcessShowtimeDto } from './dto/process-showtime.dto';
import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { getTodayInPoland } from '../lib/utils';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';
import type { UnprocessedShowtimeResponse } from './showtimes.types';

type FullSchema = typeof schema & typeof relations;

/**
 * Service for showtime-related business logic and persistence.
 */
@Injectable()
export class ShowtimesService {
  private readonly logger = new Logger(ShowtimesService.name);

  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
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
   */
  async getProcessedCityIds(from: string, to: string): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ cityId: schema.processed_cities.cityId })
      .from(schema.processed_cities)
      .where(
        and(
          gte(schema.processed_cities.processedAt, from),
          lte(schema.processed_cities.processedAt, to),
        ),
      );
    return rows.map((r) => r.cityId);
  }

  /**
   * Upserts a record in processed_cities for the given cityId and processedAt date.
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

  /**
   * Marks a showtime as processed by inserting into processed_showtimes.
   * Idempotent — duplicate calls do nothing.
   */
  async markShowtimeProcessed(dto: MarkShowtimeProcessedDto): Promise<void> {
    await this.db
      .insert(schema.processed_showtimes)
      .values({ showtimeId: dto.showtimeId })
      .onDuplicateKeyUpdate({
        set: { showtimeId: dto.showtimeId },
      });
  }

  /**
   * Returns showtimes that have NOT been marked as processed
   * and whose date falls within [from, to].
   * Uses LEFT JOIN ... IS NULL to exclude processed ones.
   */
  async getUnprocessedShowtimes(
    from: string,
    to: string,
  ): Promise<UnprocessedShowtimeResponse[]> {
    const rows = await this.db
      .select({
        id: schema.showtimes.id,
        url: schema.showtimes.url,
        cityId: schema.showtimes.cityId,
        date: schema.showtimes.date,
        createdAt: schema.showtimes.createdAt,
        updatedAt: schema.showtimes.updatedAt,
      })
      .from(schema.showtimes)
      .leftJoin(
        schema.processed_showtimes,
        eq(schema.showtimes.id, schema.processed_showtimes.showtimeId),
      )
      .where(
        and(
          isNull(schema.processed_showtimes.id),
          gte(schema.showtimes.date, new Date(from)),
          lte(schema.showtimes.date, new Date(to)),
        ),
      );

    return rows.map((r) => ({
      id: r.id,
      url: r.url,
      cityId: r.cityId,
      date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
      updatedAt:
        r.updatedAt instanceof Date
          ? r.updatedAt.toISOString()
          : String(r.updatedAt),
    }));
  }

  /**
   * Bulk upserts showtimes with chunked multi-row INSERTs.
   * Each chunk is its own statement — no wrapping transaction to avoid gap-lock deadlocks.
   * Automatically retries each chunk on deadlock via withDeadlockRetry wrapper.
   */
  async batchCreateShowtimes(
    showtimes: CreateShowtimeDto[],
  ): Promise<{ count: number }> {
    if (showtimes.length === 0) return { count: 0 };

    const CHUNK_SIZE = 500;

    for (let i = 0; i < showtimes.length; i += CHUNK_SIZE) {
      const chunk = showtimes.slice(i, i + CHUNK_SIZE);
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.showtimes)
            .values(chunk.map((s) => ({ ...s, date: new Date(s.date) })))
            .onDuplicateKeyUpdate({
              set: {
                cityId: sql`VALUES(${schema.showtimes.cityId})`,
                url: sql`VALUES(${schema.showtimes.url})`,
                date: sql`VALUES(${schema.showtimes.date})`,
              },
            }),
        { label: 'batchCreateShowtimes' },
      );
    }

    return { count: showtimes.length };
  }

  /**
   * Inserts screenings for a showtime using the provided movieId,
   * then marks the showtime as processed.
   * No explicit transaction — both operations are fully idempotent
   * (ON DUPLICATE KEY UPDATE), so auto-commit per statement avoids
   * the gap-lock deadlocks that explicit transactions cause.
   * If movieId is null, only marks the showtime as processed (skipped movie).
   */
  async processShowtime(
    showtimeId: number,
    dto: ProcessShowtimeDto,
  ): Promise<{ movieId: number | null; screeningsCount: number }> {
    this.logger.log(
      `processShowtime id=${showtimeId} movieId=${dto.movieId} screenings=${dto.screenings?.length ?? 0}`,
    );

    const showtime = await this.db.query.showtimes.findFirst({
      where: eq(schema.showtimes.id, showtimeId),
    });
    if (!showtime) {
      throw new NotFoundException(`Showtime with id ${showtimeId} not found`);
    }

    if (dto.movieId == null) {
      this.logger.warn(
        `Showtime ${showtimeId}: movieId is null — skipping screenings`,
      );
      await this.db
        .insert(schema.processed_showtimes)
        .values({ showtimeId })
        .onDuplicateKeyUpdate({ set: { showtimeId } });
      return { movieId: null, screeningsCount: 0 };
    }

    const movieId = dto.movieId;

    if (dto.screenings.length > 0) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.screenings)
            .values(
              dto.screenings.map((s) => ({
                url: s.url ?? '',
                movieId,
                showtimeId,
                cinemaId: s.cinemaId,
                type: s.type,
                date: new Date(s.date),
                isDubbing: s.isDubbing,
                isSubtitled: s.isSubtitled,
              })),
            )
            .onDuplicateKeyUpdate({
              set: {
                url: sql`VALUES(${schema.screenings.url})`,
                movieId: sql`VALUES(${schema.screenings.movieId})`,
                showtimeId: sql`VALUES(${schema.screenings.showtimeId})`,
                cinemaId: sql`VALUES(${schema.screenings.cinemaId})`,
                type: sql`VALUES(${schema.screenings.type})`,
                date: sql`VALUES(${schema.screenings.date})`,
                isDubbing: sql`VALUES(${schema.screenings.isDubbing})`,
                isSubtitled: sql`VALUES(${schema.screenings.isSubtitled})`,
              },
            }),
        { label: 'processShowtime:screenings' },
      );
    }

    // Mark showtime as processed (also auto-committed, idempotent).
    await this.db
      .insert(schema.processed_showtimes)
      .values({ showtimeId })
      .onDuplicateKeyUpdate({ set: { showtimeId } });

    return { movieId, screeningsCount: dto.screenings.length };
  }
}
