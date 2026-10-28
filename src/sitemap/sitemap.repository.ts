import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { eq, isNotNull, sql } from 'drizzle-orm';
import {
  DIRECTOR_INDEX_THRESHOLD,
  VENUE_ACTIVITY_WINDOW_DAYS,
} from './sitemap.constants';

/**
 * HAVING clause for venue rows: at least one screening dated within the last
 * VENUE_ACTIVITY_WINDOW_DAYS days or later. Venues outside it render no
 * repertoire and no recent programme, so the frontend marks them `noindex`
 * and they must not be advertised here. Screenings are never deleted, so a
 * venue that starts screening again comes back on its own.
 */
const hasRecentOrUpcomingScreening = sql`count(${schema.screenings.id}) filter (where ${schema.screenings.date} >= CURRENT_DATE - ${VENUE_ACTIVITY_WINDOW_DAYS}::int) > 0`;

/**
 * Multiplex-chain venues, matched by name the same way the frontend does
 * (lib/cinema-chains.ts): chains brand every location with the chain name.
 * Keep the two pattern lists in sync.
 */
const isChainCinema = sql`${schema.cinemas.name} ~* '\\m(cinema\\s?city|helios|multikino|cinepolis|cinema\\s?3d|imax)\\M'`;

/**
 * Extra HAVING clause for cinema rows: a chain venue stays in the sitemap
 * only while it has an upcoming screening. Its recent history alone is not
 * worth indexing - October 2026 GSC: chain pages drew ~80% of impressions
 * (people looking for the chain's own repertoire) and zero clicks. The
 * frontend marks the same pages `noindex`. `name` is usable in HAVING
 * because rows are grouped by the cinema primary key.
 */
const isIndependentOrHasUpcoming = sql`(not ${isChainCinema} or count(${schema.screenings.id}) filter (where ${schema.screenings.date} >= CURRENT_DATE) > 0)`;

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
   * Only cinemas with a recent or upcoming screening, and chain venues only
   * with an upcoming one (see above).
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
      .groupBy(schema.cinemas.id)
      .having(
        sql`${hasRecentOrUpcomingScreening} and ${isIndependentOrHasUpcoming}`,
      );
  }

  /**
   * Returns slug + effective content `updatedAt` per city with at least one cinema:
   * max over the city's cinemas and their screenings. Only cities with a
   * recent or upcoming screening in any of their cinemas (see above).
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
      .groupBy(schema.cities.id)
      .having(hasRecentOrUpcomingScreening);
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
