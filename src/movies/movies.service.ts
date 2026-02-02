import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/constants';
import { movies } from '../database/schema/schema';

/**
 * Service for movie-related business logic and persistence.
 */
@Injectable()
export class MoviesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns all movies from the database.
   */
  getMovies(): Promise<(typeof movies.$inferSelect)[]> {
    return this.db.query.movies.findMany({
      limit: 10,
      offset: 0,
    });
  }
}
