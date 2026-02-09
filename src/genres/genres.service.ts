import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import type { Genre } from './genres.types';

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
   * Returns all genres from the database.
   */
  getGenres(): Promise<Genre[]> {
    return this.db.query.genres.findMany();
  }
}
