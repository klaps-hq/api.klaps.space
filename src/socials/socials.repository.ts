import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { and, asc, eq, gte, inArray, lt, lte } from 'drizzle-orm';

const IMAGE_RETENTION_MS = 48 * 60 * 60 * 1000;

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class SocialsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  // === READ ===

  async findPostsByDateAndPlatform(
    dateFrom: string,
    dateTo: string,
    platform: string,
  ) {
    return this.db.query.socials_posts.findMany({
      where: and(
        gte(schema.socials_posts.postDate, dateFrom),
        lte(schema.socials_posts.postDate, dateTo),
        eq(schema.socials_posts.platform, platform),
      ),
    });
  }

  async findRecentPostsByPlatform(platform: string, sincePostDate: string) {
    return this.db.query.socials_posts.findMany({
      where: and(
        gte(schema.socials_posts.postDate, sincePostDate),
        eq(schema.socials_posts.platform, platform),
      ),
    });
  }

  async findScreeningsInRange(dateFrom: string, dateToNextDay: string) {
    return this.db.query.screenings.findMany({
      where: and(
        gte(schema.screenings.date, new Date(dateFrom)),
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

  async upsertPost(values: {
    postDate: string;
    platform: string;
    score: number;
    screeningId: number;
    movieId: number;
    contentType: string;
    published: boolean;
    reason: string;
  }): Promise<void> {
    await this.db
      .insert(schema.socials_posts)
      .values(values)
      .onConflictDoUpdate({
        target: [
          schema.socials_posts.postDate,
          schema.socials_posts.platform,
          schema.socials_posts.contentType,
        ],
        set: {
          published: values.published,
          reason: values.reason,
          postDate: values.postDate,
          score: values.score,
          screeningId: values.screeningId,
          platform: values.platform,
          movieId: values.movieId,
          contentType: values.contentType,
        },
      });
  }

  async markPostPublished(postId: number, postDate: string): Promise<void> {
    await this.db
      .update(schema.socials_posts)
      .set({
        published: true,
        reason: 'PUBLISHED',
        postDate,
      })
      .where(eq(schema.socials_posts.id, postId));
  }
}
