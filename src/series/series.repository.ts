import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  sql,
} from 'drizzle-orm';
import * as schema from '../database/schemas';
import * as relations from '../database/schemas/relations';
import { DRIZZLE } from '../database/constants';
import { isChainCinema } from '../cinemas/cinema-chains';
import { movieSummaryColumns } from '../screenings/screenings.repository';
import type { Series } from '../database/schemas/series.schema';

type FullSchema = typeof schema & typeof relations;

export type SeriesCounts = {
  seriesId: number;
  upcomingCount: number;
  upcomingVenues: number;
  upcomingCities: number;
  independentUpcomingCount: number;
  pastCount: number;
  lastScreeningAddedAt: Date | null;
};

@Injectable()
export class SeriesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<FullSchema>,
  ) {}

  findAll(): Promise<Series[]> {
    return this.db.query.series.findMany({ orderBy: asc(schema.series.name) });
  }

  findBySlug(slug: string): Promise<Series | undefined> {
    return this.db.query.series.findFirst({
      where: eq(schema.series.slug, slug),
    });
  }

  /**
   * Upcoming (from `now`) and past (since `since`) screening counts per
   * series. Screening dates are Polish wall clock stored as UTC, so `now`
   * must be too (lib/date.ts).
   */
  async countScreenings(
    now: Date,
    since: Date,
    seriesIds?: number[],
  ): Promise<SeriesCounts[]> {
    const s = schema.screenings;
    const upcoming = sql`${s.date} >= ${now}`;
    return this.db
      .select({
        seriesId: sql<number>`${s.seriesId}`.mapWith(Number),
        upcomingCount: sql<number>`count(*) filter (where ${upcoming})`.mapWith(
          Number,
        ),
        upcomingVenues:
          sql<number>`count(distinct ${s.cinemaId}) filter (where ${upcoming})`.mapWith(
            Number,
          ),
        upcomingCities:
          sql<number>`count(distinct ${schema.cinemas.sourceCityId}) filter (where ${upcoming})`.mapWith(
            Number,
          ),
        independentUpcomingCount:
          sql<number>`count(*) filter (where ${upcoming} and not ${isChainCinema})`.mapWith(
            Number,
          ),
        pastCount:
          sql<number>`count(*) filter (where ${s.date} < ${now})`.mapWith(
            Number,
          ),
        lastScreeningAddedAt: sql<Date | null>`max(${s.createdAt})`.mapWith(
          (v: string | Date | null) => (v ? new Date(v) : null),
        ),
      })
      .from(s)
      .innerJoin(schema.cinemas, eq(s.cinemaId, schema.cinemas.sourceId))
      .where(
        and(
          isNotNull(s.seriesId),
          gte(s.date, since),
          seriesIds ? inArray(s.seriesId, seriesIds) : undefined,
        ),
      )
      .groupBy(s.seriesId);
  }

  /** Films the series showed between `since` and `now`, latest first. */
  async findPastMovies(
    seriesId: number,
    since: Date,
    now: Date,
    limit: number,
  ) {
    const s = schema.screenings;
    const rows = await this.db
      .select({
        movieId: s.movieId,
        lastScreening: sql<Date>`max(${s.date})`.mapWith(
          (v: string | Date) => new Date(v),
        ),
        screeningsCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(s)
      .where(and(eq(s.seriesId, seriesId), gte(s.date, since), lt(s.date, now)))
      .groupBy(s.movieId)
      .orderBy(desc(sql`max(${s.date})`))
      .limit(limit);
    if (rows.length === 0) return [];
    const movies = await this.db.query.movies.findMany({
      where: inArray(
        schema.movies.id,
        rows.map((r) => r.movieId),
      ),
      columns: movieSummaryColumns,
      with: {
        movies_genres: {
          columns: {},
          with: {
            genre: {
              columns: { id: true, slug: true, name: true, description: true },
            },
          },
        },
      },
    });
    const byId = new Map(movies.map((m) => [m.id, m]));
    return rows.flatMap((r) => {
      const movie = byId.get(r.movieId);
      return movie ? [{ movie, ...r }] : [];
    });
  }

  async update(
    id: number,
    set: Partial<Pick<Series, 'name' | 'description' | 'organizer'>>,
  ): Promise<Series | undefined> {
    const [row] = await this.db
      .update(schema.series)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(schema.series.id, id))
      .returning();
    return row;
  }

  async addAliases(seriesId: number, aliases: string[]): Promise<void> {
    if (aliases.length === 0) return;
    await this.db
      .insert(schema.series_aliases)
      .values(aliases.map((alias) => ({ alias, seriesId })))
      .onConflictDoUpdate({
        target: schema.series_aliases.alias,
        set: { seriesId },
      });
  }
}
