import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { GenreResponse } from '../lib/response-types';
import { mapGenre } from '../lib/response-mappers';
import { eq } from 'drizzle-orm';

@Injectable()
export class GenresService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async getGenres(): Promise<GenreResponse[]> {
    const genres = await this.db.query.genres.findMany();
    return genres.map(mapGenre);
  }

  async getGenreByIdOrSlug(idOrSlug: string): Promise<GenreResponse | null> {
    const numericId = Number(idOrSlug);
    const condition =
      Number.isInteger(numericId) && numericId > 0
        ? eq(schema.genres.id, numericId)
        : eq(schema.genres.slug, idOrSlug);

    const genre = await this.db.query.genres.findFirst({
      where: condition,
    });
    if (!genre) return null;
    return mapGenre(genre);
  }
}
