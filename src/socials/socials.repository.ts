import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { and, asc, eq, gte, inArray, lt, lte } from 'drizzle-orm';

type FullSchema = typeof schema & typeof relations;

@Injectable()
export class SocialsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<FullSchema>,
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

  // === WRITE ===

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
      .onDuplicateKeyUpdate({
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
