import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { and, asc, eq, gte, ilike, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Director, DirectorStats } from './directors.types';
import type { UpdateDirectorDto } from './dto/update-director.dto';

@Injectable()
export class DirectorsRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === READ ===

  async findAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Director[]> {
    return this.db.query.directors.findMany({
      where: this.buildWhere(params?.search),
      orderBy: asc(schema.directors.name),
      limit: params?.limit,
      offset: params?.offset,
    });
  }

  async count(params?: { search?: string }): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(schema.directors)
      .where(this.buildWhere(params?.search));
    return result.count;
  }

  async findBySlug(slug: string) {
    return this.db.query.directors.findFirst({
      where: eq(schema.directors.slug, slug),
    });
  }

  /**
   * Per-director aggregate stats in two grouped queries - joining movies and
   * screenings in a single pass would double-count. Directors with no films or
   * no upcoming screenings are absent from the respective result and default
   * to 0 in the returned map.
   */
  async findStats(directorIds: number[]): Promise<Map<number, DirectorStats>> {
    if (directorIds.length === 0) return new Map();

    const [movieRows, screeningRows] = await Promise.all([
      this.db
        .select({
          directorId: schema.movies_directors.directorId,
          count: sql<number>`COUNT(*)`.mapWith(Number),
        })
        .from(schema.movies_directors)
        .where(inArray(schema.movies_directors.directorId, directorIds))
        .groupBy(schema.movies_directors.directorId),
      this.db
        .select({
          directorId: schema.movies_directors.directorId,
          count: sql<number>`COUNT(*)`.mapWith(Number),
        })
        .from(schema.movies_directors)
        .innerJoin(
          schema.screenings,
          eq(schema.screenings.movieId, schema.movies_directors.movieId),
        )
        .where(
          and(
            inArray(schema.movies_directors.directorId, directorIds),
            gte(schema.screenings.date, sql`CURRENT_DATE`),
          ),
        )
        .groupBy(schema.movies_directors.directorId),
    ]);

    const stats = new Map<number, DirectorStats>(
      directorIds.map((id) => [
        id,
        { moviesCount: 0, upcomingScreeningsCount: 0 },
      ]),
    );
    for (const row of movieRows) {
      stats.get(row.directorId)!.moviesCount = row.count;
    }
    for (const row of screeningRows) {
      stats.get(row.directorId)!.upcomingScreeningsCount = row.count;
    }
    return stats;
  }

  /**
   * Effective content `updatedAt` per director:
   * GREATEST(director.updatedAt, newest screening.updatedAt across their films).
   */
  async findContentUpdatedAt(
    directorIds: number[],
  ): Promise<Map<number, Date>> {
    if (directorIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        directorId: schema.directors.id,
        updatedAt:
          sql<Date>`GREATEST(${schema.directors.updatedAt}, max(${schema.screenings.updatedAt}))`.mapWith(
            schema.directors.updatedAt,
          ),
      })
      .from(schema.directors)
      .leftJoin(
        schema.movies_directors,
        eq(schema.movies_directors.directorId, schema.directors.id),
      )
      .leftJoin(
        schema.screenings,
        eq(schema.screenings.movieId, schema.movies_directors.movieId),
      )
      .where(inArray(schema.directors.id, directorIds))
      .groupBy(schema.directors.id);

    return new Map(rows.map((r) => [r.directorId, r.updatedAt]));
  }

  // === WRITE ===

  async updateBySlug(
    slug: string,
    data: UpdateDirectorDto,
  ): Promise<Director | null> {
    const condition = eq(schema.directors.slug, slug);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name != null) updateData.name = data.name;
    if (data.role != null) updateData.role = data.role;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;

    await this.db.update(schema.directors).set(updateData).where(condition);

    const director = await this.db.query.directors.findFirst({
      where: condition,
    });
    return director ?? null;
  }

  // === PRIVATE ===

  /** Only directors with a slug are queryable (every public page needs a URL). */
  private buildWhere(search?: string) {
    return and(
      isNotNull(schema.directors.slug),
      search ? ilike(schema.directors.name, `%${search}%`) : undefined,
    );
  }
}
