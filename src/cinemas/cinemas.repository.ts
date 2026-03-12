import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { eq, sql } from 'drizzle-orm';
import type { Cinema } from '../database/schemas/cinemas.schema';
import { sortAndChunk } from '../lib/chunked-upsert';
import { withDeadlockRetry } from '../lib/with-deadlock-retry';
import { toSlug, uniqueSlug } from '../lib/slug';
import type { CreateCinemasBatchItemDto } from './dto/create-cinemas-batch.dto';
import type { UpdateCinemaDto } from './dto/update-cinema.dto';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class CinemasRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  // === READ ===

  async findAll(sourceCityId?: number) {
    return this.db.query.cinemas.findMany({
      where: sourceCityId
        ? eq(schema.cinemas.sourceCityId, sourceCityId)
        : undefined,
      with: { city: true },
    });
  }

  async findBySlug(slug: string) {
    return this.db.query.cinemas.findFirst({
      where: eq(schema.cinemas.slug, slug),
      with: { city: true },
    });
  }

  // === WRITE ===

  async upsertBatch(cinemas: CreateCinemasBatchItemDto[]): Promise<void> {
    if (cinemas.length === 0) return;

    const taken = await this.findExistingSlugs();

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
            .onConflictDoUpdate({
              target: schema.cinemas.sourceId,
              set: {
                name: sql`excluded."name"`,
                url: sql`excluded."url"`,
                sourceCityId: sql`excluded."sourceCityId"`,
                longitude: sql`excluded."longitude"`,
                latitude: sql`excluded."latitude"`,
                street: sql`excluded."street"`,
              },
            }),
        { label: 'createCinemasBatch' },
      );
    }
  }

  async updateBySlug(
    slug: string,
    data: UpdateCinemaDto,
  ): Promise<Cinema | null> {
    const condition = eq(schema.cinemas.slug, slug);

    await this.db
      .update(schema.cinemas)
      .set({ ...data, updatedAt: new Date() })
      .where(condition);

    const cinema = await this.db.query.cinemas.findFirst({
      where: condition,
      with: { city: true },
    });
    return cinema ?? null;
  }

  // === PRIVATE ===

  private async findExistingSlugs(): Promise<Set<string>> {
    const rows = await this.db
      .select({ slug: schema.cinemas.slug })
      .from(schema.cinemas);
    return new Set(rows.map((r) => r.slug));
  }
}
