import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schema/schema';
import { DRIZZLE } from '../database/constants';
import type { MovieWithGenres } from './movies.types';
import { lte } from 'drizzle-orm';

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
   * Returns movies older than 3 years from the database with their genres. Example: 2026 -> movies from 2023 and older.
   */
  getMovies(): Promise<MovieWithGenres[]> {
    const cutoffYear = new Date().getFullYear() - 3;
    return this.db.query.movies.findMany({
      where: lte(schema.movies.productionYear, cutoffYear),
      limit: 30,
      offset: 0,
      with: {
        movies_genres: {
          with: {
            genre: true,
          },
        },
      },
    });
  }
}
