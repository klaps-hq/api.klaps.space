import { Controller, Get, UseGuards } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { movies } from '../database/schema/schema';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  /**
   * Returns all movies.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getMovies(): Promise<(typeof movies.$inferSelect)[]> {
    return this.moviesService.getMovies();
  }
}
