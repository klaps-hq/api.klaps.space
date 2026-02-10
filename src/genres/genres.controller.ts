import { Controller, Get, UseGuards } from '@nestjs/common';
import { GenresService } from './genres.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { GenreResponse } from '../lib/response-types';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  /**
   * URL: /api/v1/genres
   * Returns all available genres (clean, no DB internals).
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getGenres(): Promise<GenreResponse[]> {
    return this.genresService.getGenres();
  }
}
