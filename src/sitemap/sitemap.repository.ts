import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { eq } from 'drizzle-orm';

export type SitemapRow = {
  slug: string;
  updatedAt?: Date;
};

@Injectable()
export class SitemapRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === READ ===

  async findMovieEntries(): Promise<SitemapRow[]> {
    return this.db
      .select({ slug: schema.movies.slug, updatedAt: schema.movies.updatedAt })
      .from(schema.movies);
  }

  async findCinemaEntries(): Promise<SitemapRow[]> {
    return this.db
      .select({
        slug: schema.cinemas.slug,
        updatedAt: schema.cinemas.updatedAt,
      })
      .from(schema.cinemas);
  }

  /**
   * Only cities with at least one cinema; empty city pages are noindex
   * on the frontend and must not be submitted to crawlers. Cities carry
   * no updatedAt column, so no date is returned for them.
   */
  async findCityEntriesWithCinemas(): Promise<SitemapRow[]> {
    return this.db
      .selectDistinct({ slug: schema.cities.slug })
      .from(schema.cities)
      .innerJoin(
        schema.cinemas,
        eq(schema.cinemas.sourceCityId, schema.cities.sourceId),
      );
  }

  async findGenreEntries(): Promise<SitemapRow[]> {
    return this.db
      .select({ slug: schema.genres.slug, updatedAt: schema.genres.updatedAt })
      .from(schema.genres);
  }
}
