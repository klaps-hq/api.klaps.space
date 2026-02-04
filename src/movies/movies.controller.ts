import { Controller, Get, UseGuards } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { MovieWithGenres } from './movies.types';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  /**
   * URL: /api/v1/movies
   * Returns all movies with their genres.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getMovies(): Promise<MovieWithGenres[]> {
    return this.moviesService.getMovies();
  }
}
