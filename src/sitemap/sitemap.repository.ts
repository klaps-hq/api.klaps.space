import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { isIndependentCinema } from '../cinemas/cinema-chains';
import {
  DIRECTOR_INDEX_THRESHOLD,
  VENUE_ACTIVITY_WINDOW_DAYS,
} from './sitemap.constants';

/**
 * HAVING clause for venue and movie rows: at least one screening dated within
 * the last VENUE_ACTIVITY_WINDOW_DAYS days or later. Pages outside it render
 * no repertoire and no recent programme, so the frontend marks them `noindex`
 * and they must not be advertised here. Screenings are never deleted, so a
 * venue or movie that starts screening again comes back on its own.
 */
const hasRecentOrUpcomingScreening = sql`count(${schema.screenings.id}) filter (where ${schema.screenings.date} >= CURRENT_DATE - ${VENUE_ACTIVITY_WINDOW_DAYS}::int) > 0`;

/**
 * Same window as hasRecentOrUpcomingScreening, counting only screenings in
 * independent (non-chain) cinemas. Needs `cinemas` joined to `screenings`.
 * A movie or city whose only recent programme is a multiplex run - mass
 * reissues such as the Avengers marathons - is not what the site is about:
 * October 2026 GSC showed such pages drawing impressions from people looking
 * for the chain's own repertoire, and zero clicks.
 */
const hasRecentOrUpcomingIndependentScreening = sql`count(${schema.screenings.id}) filter (where ${schema.screenings.date} >= CURRENT_DATE - ${VENUE_ACTIVITY_WINDOW_DAYS}::int and ${isIndependentCinema}) > 0`;

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
   * Only movies with a recent or upcoming screening: the frontend keeps a
   * movie page indexable while it has upcoming screenings or played anywhere
   * within the window (its 'Ostatnio w kinach' list), and marks the rest
   * `noindex`. Returning the whole catalogue made the frontend cross-check
   * against upcoming screenings only, so movies between runs - indexable
   * pages - were left out of the sitemap. Screenings in chain multiplexes do
   * not count: a film that only plays there is left out.
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
      .leftJoin(
        schema.cinemas,
        eq(schema.cinemas.sourceId, schema.screenings.cinemaId),
      )
      .groupBy(schema.movies.id)
      .having(hasRecentOrUpcomingIndependentScreening);
  }

  /**
   * Returns slug + effective content `updatedAt` per cinema:
   * max(cinema.updatedAt, newest screening.updatedAt in that cinema).
   * Only independent cinemas with a recent or upcoming screening. Chain
   * venues are never listed, whatever their programme: October 2026 GSC
   * showed them drawing ~87% of impressions (people looking for the chain's
   * own repertoire) and zero clicks. `name` is usable in HAVING because rows
   * are grouped by the cinema primary key.
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
      .having(sql`${hasRecentOrUpcomingScreening} and ${isIndependentCinema}`);
  }

  /**
   * Returns slug + effective content `updatedAt` per city with at least one cinema:
   * max over the city's cinemas and their screenings. Only cities with a
   * recent or upcoming screening in an independent cinema: a city with
   * nothing but multiplexes is left out (see above).
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
      .having(hasRecentOrUpcomingIndependentScreening);
  }

  /**
   * Returns slug + effective content `updatedAt` per director, restricted to
   * directors with at least DIRECTOR_INDEX_THRESHOLD upcoming screenings
   * (date >= today) in independent cinemas - below that the frontend marks
   * the page `noindex`, so it must not appear in the sitemap. Same count as
   * DirectorResponse.upcomingIndependentScreeningsCount. Multiplex reissues
   * alone (Joe and Anthony Russo, Gary Ross) do not make a director page.
   * updatedAt is GREATEST(director.updatedAt, newest screening.updatedAt
   * across their films).
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
      .leftJoin(
        schema.cinemas,
        eq(schema.cinemas.sourceId, schema.screenings.cinemaId),
      )
      .where(isNotNull(schema.directors.slug))
      .groupBy(schema.directors.id)
      .having(
        sql`count(*) filter (where ${schema.screenings.date} >= CURRENT_DATE and ${isIndependentCinema}) >= ${DIRECTOR_INDEX_THRESHOLD}`,
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
