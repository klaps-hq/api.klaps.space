import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { eq, sql } from 'drizzle-orm';
import type { Genre } from '../database/schemas/genres.schema';
import type { UpdateGenreDto } from './dto/update-genre.dto';

@Injectable()
export class GenresRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === READ ===

  async findAll(): Promise<Genre[]> {
    return this.db.query.genres.findMany();
  }

  async findBySlug(slug: string) {
    return this.db.query.genres.findFirst({
      where: eq(schema.genres.slug, slug),
    });
  }

  /**
   * Returns the effective content `updatedAt` per genre:
   * max(genre.updatedAt, newest movie.updatedAt in that genre).
   */
  async findContentUpdatedAt(): Promise<Map<number, Date>> {
    const rows = await this.db
      .select({
        genreId: schema.genres.id,
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

    return new Map(rows.map((r) => [r.genreId, r.updatedAt]));
  }

  // === WRITE ===

  async updateBySlug(
    slug: string,
    data: UpdateGenreDto,
  ): Promise<Genre | null> {
    const condition = eq(schema.genres.slug, slug);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name != null) updateData.name = data.name;
    if (data.slug != null) updateData.slug = data.slug;
    if (data.description !== undefined)
      updateData.description = data.description;

    await this.db.update(schema.genres).set(updateData).where(condition);

    const genre = await this.db.query.genres.findFirst({ where: condition });
    return genre ?? null;
  }
}
