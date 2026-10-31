import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm';

const IMAGE_RETENTION_MS = 48 * 60 * 60 * 1000;

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class SocialsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  // === READ ===

  // Feed posts of a platform created (reserved, then published) within
  // [from, to) - the per-day publishing limit counts these.
  async findFeedPostsCreatedBetween(platform: string, from: Date, to: Date) {
    return this.db.query.socials_posts.findMany({
      where: and(
        eq(schema.socials_posts.platform, platform),
        eq(schema.socials_posts.contentType, 'feed_candidate'),
        gte(schema.socials_posts.createdAt, from),
        lt(schema.socials_posts.createdAt, to),
      ),
    });
  }

  async findRecentPostsByPlatform(platforms: string[], since: Date) {
    return this.db.query.socials_posts.findMany({
      where: and(
        gte(schema.socials_posts.createdAt, since),
        inArray(schema.socials_posts.platform, platforms),
      ),
    });
  }

  // `notBefore` cuts off screenings earlier on the first day of the range
  // (already started or starting too soon to be worth a post).
  async findScreeningsInRange(
    dateFrom: string,
    dateToNextDay: string,
    notBefore: Date,
  ) {
    const rangeStart = new Date(dateFrom);
    const lowerBound = notBefore > rangeStart ? notBefore : rangeStart;

    return this.db.query.screenings.findMany({
      where: and(
        gte(schema.screenings.date, lowerBound),
        lt(schema.screenings.date, new Date(dateToNextDay)),
      ),
      orderBy: asc(schema.screenings.date),
      with: {
        movie: {
          with: {
            movies_genres: true,
          },
        },
        cinema: {
          with: {
            city: true,
          },
        },
      },
    });
  }

  async findScreeningsByIds(ids: number[]) {
    return this.db.query.screenings.findMany({
      where: inArray(schema.screenings.id, ids),
      with: {
        movie: {
          with: {
            movies_genres: true,
            // Production countries, for themed reels (e.g. Polish films on 11 November).
            movies_countries: { with: { country: true } },
          },
        },
        cinema: {
          with: {
            city: true,
          },
        },
      },
    });
  }

  async findScreeningById(id: number) {
    return this.db.query.screenings.findFirst({
      where: eq(schema.screenings.id, id),
    });
  }

  async findPostByPlatformAndScreening(platform: string, screeningId: number) {
    return this.db.query.socials_posts.findFirst({
      where: and(
        eq(schema.socials_posts.platform, platform),
        eq(schema.socials_posts.screeningId, screeningId),
      ),
    });
  }

  async findImageById(id: string) {
    return this.db.query.socials_images.findFirst({
      where: eq(schema.socials_images.id, id),
    });
  }

  // === WRITE ===

  async insertImage(
    data: Buffer,
    contentType: string,
  ): Promise<{ id: string }> {
    // Images are only needed until Instagram ingests them - prune stale
    // rows on every insert so the table never grows.
    await this.db
      .delete(schema.socials_images)
      .where(
        lt(
          schema.socials_images.createdAt,
          new Date(Date.now() - IMAGE_RETENTION_MS),
        ),
      );

    const [row] = await this.db
      .insert(schema.socials_images)
      .values({ data, contentType })
      .returning({ id: schema.socials_images.id });

    return row;
  }

  async insertPost(values: {
    postDate: string;
    platform: string;
    score: number;
    screeningId: number;
    movieId: number;
    contentType: string;
    published: boolean;
    reason: string;
  }): Promise<void> {
    await this.db.insert(schema.socials_posts).values(values);
  }

  // postDate stays the screening date; the publication day is createdAt.
  async markPostPublished(postId: number): Promise<void> {
    await this.db
      .update(schema.socials_posts)
      .set({
        published: true,
        reason: 'PUBLISHED',
      })
      .where(eq(schema.socials_posts.id, postId));
  }
}
