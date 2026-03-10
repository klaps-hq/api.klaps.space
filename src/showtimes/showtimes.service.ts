import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type { Showtime } from './showtimes.types';
import type { CreateShowtimeDto } from './dto/create-showtime.dto';
import type { ProcessShowtimeDto } from './dto/process-showtime.dto';
import { and, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { getTodayInPoland } from '../lib/utils';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class ShowtimesService {
  private readonly logger = new Logger(ShowtimesService.name);

  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  async getShowtimes(): Promise<Showtime[]> {
    const today = getTodayInPoland();
    return this.db.query.showtimes.findMany({
      where: and(
        gte(schema.showtimes.createdAt, new Date(`${today}T00:00:00`)),
        lte(schema.showtimes.createdAt, new Date(`${today}T23:59:59`)),
      ),
    });
  }

  async getTodayCities(): Promise<number[]> {
    const [fromShowtimes, fromCities] = await Promise.all([
      this.db
        .selectDistinct({ cityId: schema.showtimes.cityId })
        .from(schema.showtimes)
        .where(eq(sql`DATE(${schema.showtimes.createdAt})`, sql`CURDATE()`)),
      this.db
        .select({ cityId: schema.cities.id })
        .from(schema.cities)
        .where(eq(sql`DATE(${schema.cities.lastScrapedAt})`, sql`CURDATE()`)),
    ]);

    const ids = new Set([
      ...fromShowtimes.map((r) => r.cityId),
      ...fromCities.map((r) => r.cityId),
    ]);
    return [...ids];
  }

  async getPending(): Promise<Showtime[]> {
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
        schema.screenings,
        eq(schema.screenings.showtimeId, schema.showtimes.id),
      )
      .where(isNull(schema.screenings.id));
    return rows as Showtime[];
  }

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

  async batchCreateShowtimes(
    showtimes: CreateShowtimeDto[],
    scrapedCityIds?: number[],
  ): Promise<{ count: number }> {
    const CHUNK_SIZE = 500;

    if (showtimes.length > 0) {
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
    }

    if (scrapedCityIds && scrapedCityIds.length > 0) {
      for (let i = 0; i < scrapedCityIds.length; i += CHUNK_SIZE) {
        const chunk = scrapedCityIds.slice(i, i + CHUNK_SIZE);
        await this.db
          .update(schema.cities)
          .set({ lastScrapedAt: new Date() })
          .where(inArray(schema.cities.id, chunk));
      }
    }

    return { count: showtimes.length };
  }

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

    return { movieId, screeningsCount: dto.screenings.length };
  }
}
