import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { DIRECTOR_INDEX_THRESHOLD } from './sitemap.constants';

export type SitemapRow = {
  slug: string;
  updatedAt: Date | null;
};

@Injectable()
export class SitemapRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === READ ===

  /**
   * Returns slug + effective content `updatedAt` per movie:
   * max(movie.updatedAt, newest screening.updatedAt of that movie).
   */
  async findMovieEntries(): Promise<SitemapRow[]> {
    return this.db
      .select({
        slug: schema.movies.slug,
        updatedAt:
          sql<Date>`GREATEST(${schema.movies.updatedAt}, max(${schema.screenings.updatedAt}))`.mapWith(
            schema.movies.updatedAt,
          ),
      })
      .from(schema.movies)
      .leftJoin(
        schema.screenings,
        eq(schema.screenings.movieId, schema.movies.id),
      )
      .groupBy(schema.movies.id);
  }

  /**
   * Returns slug + effective content `updatedAt` per cinema:
   * max(cinema.updatedAt, newest screening.updatedAt in that cinema).
   */
  async findCinemaEntries(): Promise<SitemapRow[]> {
    return this.db
      .select({
        slug: schema.cinemas.slug,
        updatedAt:
          sql<Date>`GREATEST(${schema.cinemas.updatedAt}, max(${schema.screenings.updatedAt}))`.mapWith(
            schema.cinemas.updatedAt,
          ),
      })
      .from(schema.cinemas)
      .leftJoin(
        schema.screenings,
        eq(schema.screenings.cinemaId, schema.cinemas.sourceId),
      )
      .groupBy(schema.cinemas.id);
  }

  /**
   * Returns slug + effective content `updatedAt` per city with at least one cinema:
   * max over the city's cinemas and their screenings.
   */
  async findCityEntries(): Promise<SitemapRow[]> {
    return this.db
      .select({
        slug: schema.cities.slug,
        updatedAt:
          sql<Date>`GREATEST(max(${schema.cinemas.updatedAt}), max(${schema.screenings.updatedAt}))`.mapWith(
            schema.cinemas.updatedAt,
          ),
      })
      .from(schema.cities)
      .innerJoin(
        schema.cinemas,
        eq(schema.cinemas.sourceCityId, schema.cities.sourceId),
      )
      .leftJoin(
        schema.screenings,
        eq(schema.screenings.cinemaId, schema.cinemas.sourceId),
      )
      .groupBy(schema.cities.id);
  }

  /**
   * Returns slug + effective content `updatedAt` per director, restricted to
   * directors with at least DIRECTOR_INDEX_THRESHOLD upcoming screenings
   * (date >= today) - below that the frontend marks the page `noindex`, so it
   * must not appear in the sitemap. updatedAt is GREATEST(director.updatedAt,
   * newest screening.updatedAt across their films).
   */
  async findDirectorEntries(): Promise<SitemapRow[]> {
    return this.db
      .select({
        slug: sql<string>`${schema.directors.slug}`,
        updatedAt:
          sql<Date>`GREATEST(${schema.directors.updatedAt}, max(${schema.screenings.updatedAt}))`.mapWith(
            schema.directors.updatedAt,
          ),
      })
      .from(schema.directors)
      .innerJoin(
        schema.movies_directors,
        eq(schema.movies_directors.directorId, schema.directors.id),
      )
      .innerJoin(
        schema.screenings,
        eq(schema.screenings.movieId, schema.movies_directors.movieId),
      )
      .where(isNotNull(schema.directors.slug))
      .groupBy(schema.directors.id)
      .having(
        sql`count(*) filter (where ${schema.screenings.date} >= CURRENT_DATE) >= ${DIRECTOR_INDEX_THRESHOLD}`,
      );
  }

  /**
   * Returns slug + effective content `updatedAt` per genre:
   * max(genre.updatedAt, newest movie.updatedAt in that genre).
   */
  async findGenreEntries(): Promise<SitemapRow[]> {
    return this.db
      .select({
        slug: schema.genres.slug,
        updatedAt:
          sql<Date>`GREATEST(${schema.genres.updatedAt}, max(${schema.movies.updatedAt}))`.mapWith(
            schema.genres.updatedAt,
          ),
      })
      .from(schema.genres)
      .leftJoin(
        schema.movies_genres,
        eq(schema.movies_genres.genreId, schema.genres.id),
      )
      .leftJoin(
        schema.movies,
        eq(schema.movies.id, schema.movies_genres.movieId),
      )
      .groupBy(schema.genres.id);
  }
}
