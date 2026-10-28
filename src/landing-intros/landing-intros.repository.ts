import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { asc, eq, sql } from 'drizzle-orm';
import type { LandingIntro } from '../database/schemas/landing_intros.schema';

@Injectable()
export class LandingIntrosRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === READ ===

  async findAll(): Promise<LandingIntro[]> {
    return this.db.query.landing_intros.findMany({
      orderBy: asc(schema.landing_intros.key),
    });
  }

  async findByKey(key: string): Promise<LandingIntro | undefined> {
    return this.db.query.landing_intros.findFirst({
      where: eq(schema.landing_intros.key, key),
    });
  }

  // === WRITE ===

  async upsert(key: string, content: string): Promise<LandingIntro> {
    const [row] = await this.db
      .insert(schema.landing_intros)
      .values({ key, content })
      .onConflictDoUpdate({
        target: schema.landing_intros.key,
        set: { content, updatedAt: sql`now()` },
      })
      .returning();
    return row;
  }
}
