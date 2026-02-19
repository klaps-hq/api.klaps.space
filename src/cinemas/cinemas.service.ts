import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { GetCinemasParams } from './cinemas.types';
import type { CreateCinemaDto } from './dto/create-cinema.dto';
import type { Cinema } from '../database/schemas/cinemas.schema';
import type {
  CinemaGroupResponse,
  CinemaResponse,
} from '../lib/response-types';
import { mapCity, mapCinemaDetail } from '../lib/response-mappers';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';

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
   * Returns cinemas pre-grouped by city, sorted by cinema count descending.
   */
  async getCinemas(
    params?: GetCinemasParams,
  ): Promise<{ data: CinemaGroupResponse[] }> {
    const limit = Math.min(
      params?.limit ?? DEFAULT_CINEMA_LIMIT,
      MAX_CINEMA_LIMIT,
    );
    const cityCondition = params?.cityId
      ? inArray(
          schema.cinemas.sourceCityId,
          this.db
            .select({ sourceId: schema.cities.sourceId })
            .from(schema.cities)
            .where(eq(schema.cities.id, params.cityId)),
        )
      : undefined;
    const cinemas = await this.db.query.cinemas.findMany({
      where: cityCondition ? and(cityCondition) : undefined,
      limit,
      with: { city: true },
    });
    const grouped = new Map<number, CinemaGroupResponse>();
    for (const cinema of cinemas) {
      const cityId = cinema.city?.id ?? 0;
      const existing = grouped.get(cityId);
      const cinemaSummary = {
        id: cinema.id,
        name: cinema.name,
        street: cinema.street,
      };
      if (existing) {
        existing.cinemas.push(cinemaSummary);
      } else {
        grouped.set(cityId, {
          city: cinema.city
            ? mapCity(cinema.city)
            : { id: 0, name: '', nameDeclinated: '' },
          cinemas: [cinemaSummary],
        });
      }
    }
    const sorted = [...grouped.values()].sort(
      (a, b) => b.cinemas.length - a.cinemas.length,
    );
    return { data: sorted };
  }

  /**
   * Creates or updates a cinema (upserts on duplicate sourceId) and returns the raw row.
   */
  async createCinema(dto: CreateCinemaDto): Promise<Cinema> {
    await this.db
      .insert(schema.cinemas)
      .values(dto)
      .onDuplicateKeyUpdate({
        set: {
          name: dto.name,
          url: dto.url,
          sourceCityId: dto.sourceCityId,
          longitude: dto.longitude ?? null,
          latitude: dto.latitude ?? null,
          street: dto.street ?? null,
        },
      });
    const cinema = await this.db.query.cinemas.findFirst({
      where: eq(schema.cinemas.sourceId, dto.sourceId),
    });
    return cinema!;
  }

  /**
   * Bulk upserts cinemas with a single multi-row INSERT.
   * No explicit transaction — INSERT … ON DUPLICATE KEY UPDATE is already
   * atomic and idempotent, so auto-commit avoids the gap-lock deadlocks
   * that explicit transactions cause under concurrent requests.
   * Automatically retries on deadlock via withDeadlockRetry wrapper.
   */
  async batchCreateCinemas(
    cinemas: CreateCinemaDto[],
  ): Promise<{ count: number }> {
    if (cinemas.length === 0) return { count: 0 };

    await withDeadlockRetry(
      () =>
        this.db
          .insert(schema.cinemas)
          .values(cinemas)
          .onDuplicateKeyUpdate({
            set: {
              name: sql`VALUES(${schema.cinemas.name})`,
              url: sql`VALUES(${schema.cinemas.url})`,
              sourceCityId: sql`VALUES(${schema.cinemas.sourceCityId})`,
              longitude: sql`VALUES(${schema.cinemas.longitude})`,
              latitude: sql`VALUES(${schema.cinemas.latitude})`,
              street: sql`VALUES(${schema.cinemas.street})`,
            },
          }),
      { label: 'batchCreateCinemas' },
    );

    return { count: cinemas.length };
  }

  /**
   * Returns a single cinema by id with nested city, stripped of DB internals.
   */
  async getCinemaById(id: number): Promise<CinemaResponse | null> {
    const cinema = await this.db.query.cinemas.findFirst({
      where: eq(schema.cinemas.id, id),
      with: { city: true },
    });
    if (!cinema) return null;
    return mapCinemaDetail(cinema);
  }
}
