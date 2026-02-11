import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { GenreResponse } from '../lib/response-types';
import { mapGenre } from '../lib/response-mappers';

/**
 * Service for genre-related business logic and persistence.
 */
@Injectable()
export class GenresService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns all genres, stripped of DB internals (filmwebId, timestamps).
   */
  async getGenres(): Promise<GenreResponse[]> {
    const genres = await this.db.query.genres.findMany();
    return genres.map(mapGenre);
  }
}
