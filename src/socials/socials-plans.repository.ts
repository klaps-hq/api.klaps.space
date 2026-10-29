import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  ne,
  notInArray,
} from 'drizzle-orm';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import type {
  NewSocialsPlan,
  SocialsPlan,
} from '../database/schemas/socials_plans.schema';

type FullSchema = typeof schema & typeof relations;

// Images of past slots are only kept this long; the plan rows stay as the
// post history.
const MEDIA_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
// Slots that never went out (skipped, failed, still planned) are dropped
// after this long.
const UNPUBLISHED_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class SocialsPlansRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  findPlansInRange(from: Date, to: Date) {
    return this.db.query.socials_plans.findMany({
      where: and(
        gte(schema.socials_plans.slotAt, from),
        lte(schema.socials_plans.slotAt, to),
      ),
      orderBy: asc(schema.socials_plans.slotAt),
      with: {
        media: {
          columns: { id: true, position: true },
          orderBy: asc(schema.socials_plan_media.position),
        },
      },
    });
  }

  findPlanById(id: string): Promise<SocialsPlan | undefined> {
    return this.db.query.socials_plans.findFirst({
      where: eq(schema.socials_plans.id, id),
    });
  }

  findMediaById(id: string) {
    return this.db.query.socials_plan_media.findFirst({
      where: eq(schema.socials_plan_media.id, id),
    });
  }

  findScreeningsByIds(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.db.query.screenings.findMany({
      where: inArray(schema.screenings.id, ids),
      with: { movie: true, cinema: { with: { city: true } } },
    });
  }

  findPostsInRange(from: Date, to: Date) {
    return this.db.query.socials_posts.findMany({
      where: and(
        gte(schema.socials_posts.createdAt, from),
        lte(schema.socials_posts.createdAt, to),
      ),
      orderBy: asc(schema.socials_posts.createdAt),
    });
  }

  /**
   * Replaces the not-yet-published plans of a window with a fresh set.
   * Published rows are never touched; their slot keys are skipped.
   */
  async replaceWindow(
    from: Date,
    to: Date,
    plans: NewSocialsPlan[],
  ): Promise<{ slotKey: string; id: string }[]> {
    return this.db.transaction(async (tx) => {
      const published = await tx
        .select({ slotKey: schema.socials_plans.slotKey })
        .from(schema.socials_plans)
        .where(eq(schema.socials_plans.status, 'published'));
      const keep = published.map((p) => p.slotKey);

      await tx
        .delete(schema.socials_plans)
        .where(
          and(
            gte(schema.socials_plans.slotAt, from),
            lte(schema.socials_plans.slotAt, to),
            ne(schema.socials_plans.status, 'published'),
          ),
        );

      const fresh = plans.filter((p) => !keep.includes(p.slotKey));
      if (fresh.length === 0) return [];
      return tx.insert(schema.socials_plans).values(fresh).returning({
        slotKey: schema.socials_plans.slotKey,
        id: schema.socials_plans.id,
      });
    });
  }

  async insertMedia(values: {
    planId: string;
    position: number;
    contentType: string;
    data: Buffer;
  }): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(schema.socials_plan_media)
      .values(values)
      .returning({ id: schema.socials_plan_media.id });
    return row;
  }

  async updateBySlotKey(
    slotKey: string,
    set: Partial<NewSocialsPlan>,
  ): Promise<SocialsPlan | undefined> {
    const [row] = await this.db
      .update(schema.socials_plans)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(schema.socials_plans.slotKey, slotKey))
      .returning();
    return row;
  }

  async prune(now = Date.now()): Promise<void> {
    const oldPlans = this.db
      .select({ id: schema.socials_plans.id })
      .from(schema.socials_plans)
      .where(
        lt(schema.socials_plans.slotAt, new Date(now - MEDIA_RETENTION_MS)),
      );
    await this.db
      .delete(schema.socials_plan_media)
      .where(inArray(schema.socials_plan_media.planId, oldPlans));
    await this.db
      .delete(schema.socials_plans)
      .where(
        and(
          lt(
            schema.socials_plans.slotAt,
            new Date(now - UNPUBLISHED_RETENTION_MS),
          ),
          notInArray(schema.socials_plans.status, ['published']),
        ),
      );
  }
}
