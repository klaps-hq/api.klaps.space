import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { Genre } from '../database/schemas/genres.schema';
import type { GenreResponse } from '../lib/response-types';
import { mapGenre } from '../lib/response-mappers';
import { eq } from 'drizzle-orm';
import type { GetGenresQueryDto } from './dto/get-genres-query.dto';
import type { UpdateGenreDto } from './dto/update-genre.dto';

const DEFAULT_GENRE_LIMIT = 50;
const MAX_GENRE_LIMIT = 200;

@Injectable()
export class GenresService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  // === READ ===

  async getGenres(query: GetGenresQueryDto): Promise<Genre[]> {
    const limit = Math.min(query.limit ?? DEFAULT_GENRE_LIMIT, MAX_GENRE_LIMIT);
    const offset = ((query.page ?? 1) - 1) * limit;
    return this.db.query.genres.findMany({ limit, offset });
  }

  async getGenreByIdOrSlug(idOrSlug: string): Promise<GenreResponse | null> {
    const numericId = Number(idOrSlug);
    const isId = Number.isInteger(numericId) && numericId > 0;

    const genre = await this.db.query.genres.findFirst({
      where: isId
        ? eq(schema.genres.id, numericId)
        : eq(schema.genres.slug, idOrSlug),
    });

    if (!genre) return null;
    return mapGenre(genre);
  }

  // === WRITE ===

  async updateGenreByIdOrSlug(
    idOrSlug: string,
    data: UpdateGenreDto,
  ): Promise<Genre | null> {
    const numericId = Number(idOrSlug);
    const isId = Number.isInteger(numericId) && numericId > 0;
    const condition = isId
      ? eq(schema.genres.id, numericId)
      : eq(schema.genres.slug, idOrSlug);

    await this.db
      .update(schema.genres)
      .set({ ...data, updatedAt: new Date() })
      .where(condition);

    const genre = await this.db.query.genres.findFirst({ where: condition });
    return genre ?? null;
  }
}
