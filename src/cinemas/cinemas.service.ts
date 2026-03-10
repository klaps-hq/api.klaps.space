import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Cinema } from '../database/schemas/cinemas.schema';
import type { CinemaGroupResponse, CinemaResponse } from '../lib/response-types';
import { mapCity, mapCinemaDetail } from '../lib/response-mappers';
import { sortAndChunk } from '../wrappers/chunked-upsert';
import { withDeadlockRetry } from '../wrappers/with-deadlock-retry';
import { toSlug, uniqueSlug } from '../lib/slug';
import type { GetCinemasDto } from './dto/get-cinemas.dto';
import type { PostCinemasBatchCinemaDto, PostCinemaDto } from './dto/post-cinemas.dto';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class CinemasService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
  ) {}

  async getCinemas(
    query: GetCinemasDto,
  ): Promise<{ data: CinemaGroupResponse[] } | { data: Cinema[] }> {
    let cityCondition;
    if (query.cityId) {
      cityCondition = inArray(
        schema.cinemas.sourceCityId,
        this.db
          .select({ sourceId: schema.cities.sourceId })
          .from(schema.cities)
          .where(eq(schema.cities.id, query.cityId)),
      );
    } else if (query.citySlug) {
      cityCondition = inArray(
        schema.cinemas.sourceCityId,
        this.db
          .select({ sourceId: schema.cities.sourceId })
          .from(schema.cities)
          .where(eq(schema.cities.slug, query.citySlug)),
      );
    }

    if (query.flat) {
      const cinemas = await this.db.query.cinemas.findMany({
        where: cityCondition ? and(cityCondition) : undefined,
      });
      return { data: cinemas };
    }

    const cinemas = await this.db.query.cinemas.findMany({
      where: cityCondition ? and(cityCondition) : undefined,
      with: { city: true },
    });

    const grouped = new Map<number, CinemaGroupResponse>();
    for (const cinema of cinemas) {
      const cityId = cinema.city?.id ?? 0;
      const existing = grouped.get(cityId);
      const cinemaSummary = {
        id: cinema.id,
        slug: cinema.slug,
        name: cinema.name,
        street: cinema.street,
      };
      if (existing) {
        existing.cinemas.push(cinemaSummary);
      } else {
        grouped.set(cityId, {
          city: cinema.city
            ? mapCity(cinema.city)
            : { id: 0, slug: '', name: '', nameDeclinated: '', description: null },
          cinemas: [cinemaSummary],
        });
      }
    }

    const sorted = [...grouped.values()].sort(
      (a, b) => b.cinemas.length - a.cinemas.length,
    );
    return { data: sorted };
  }

  async getCinemaByIdOrSlug(idOrSlug: string): Promise<CinemaResponse> {
    const numericId = Number(idOrSlug);
    const isId = Number.isInteger(numericId) && numericId > 0;

    const cinema = await this.db.query.cinemas.findFirst({
      where: isId
        ? eq(schema.cinemas.id, numericId)
        : eq(schema.cinemas.slug, idOrSlug),
      with: { city: true },
    });

    if (!cinema) throw new NotFoundException(`Cinema "${idOrSlug}" not found`);
    return mapCinemaDetail(cinema);
  }

  async updateCinemaByIdOrSlug(
    idOrSlug: string,
    data: PostCinemaDto,
  ): Promise<Cinema> {
    const numericId = Number(idOrSlug);
    const isId = Number.isInteger(numericId) && numericId > 0;
    const condition = isId
      ? eq(schema.cinemas.id, numericId)
      : eq(schema.cinemas.slug, idOrSlug);

    await this.db
      .update(schema.cinemas)
      .set({ ...data, updatedAt: new Date() })
      .where(condition);

    const cinema = await this.db.query.cinemas.findFirst({ where: condition });
    if (!cinema) throw new NotFoundException(`Cinema "${idOrSlug}" not found`);
    return cinema;
  }

  // Upsert cinemas with chunked inserts and deadlock retry.
  async createCinemasBatch(cinemas: PostCinemasBatchCinemaDto[]): Promise<void> {
    if (cinemas.length === 0) return;

    const existingSlugs = await this.db
      .select({ slug: schema.cinemas.slug })
      .from(schema.cinemas);
    const taken = new Set(existingSlugs.map((r) => r.slug));

    const values = cinemas.map((c) => {
      const slug = uniqueSlug(toSlug(c.name), taken);
      taken.add(slug);
      return { ...c, slug };
    });

    const chunks = sortAndChunk(values, (c) => c.sourceId);
    for (const chunk of chunks) {
      await withDeadlockRetry(
        () =>
          this.db
            .insert(schema.cinemas)
            .values(chunk)
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
        { label: 'createCinemasBatch' },
      );
    }
  }
}
