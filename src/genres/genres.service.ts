import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { Genre } from '../database/schemas/genres.schema';
import type { GenreResponse } from '../lib/response-types';
import { mapGenre } from '../lib/response-mappers';
import { eq } from 'drizzle-orm';

const DEFAULT_GENRE_LIMIT = 50;
const MAX_GENRE_LIMIT = 200;

@Injectable()
export class GenresService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async getGenres(params?: { page?: number; limit?: number }): Promise<Genre[]> {
    const limit = Math.min(params?.limit ?? DEFAULT_GENRE_LIMIT, MAX_GENRE_LIMIT);
    const offset = ((params?.page ?? 1) - 1) * limit;
    return this.db.query.genres.findMany({ limit, offset });
  }

  async getGenreByIdOrSlug(idOrSlug: string): Promise<GenreResponse | null> {
    const numericId = Number(idOrSlug);
    const condition =
      Number.isInteger(numericId) && numericId > 0
        ? eq(schema.genres.id, numericId)
        : eq(schema.genres.slug, idOrSlug);

    const genre = await this.db.query.genres.findFirst({ where: condition });
    if (!genre) return null;
    return mapGenre(genre);
  }

  async updateGenre(
    id: number,
    data: { description?: string | null },
  ): Promise<Genre | null> {
    await this.db
      .update(schema.genres)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.genres.id, id));
    return (await this.db.query.genres.findFirst({
      where: eq(schema.genres.id, id),
    })) ?? null;
  }
}
