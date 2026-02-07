import { Controller, Get, UseGuards } from '@nestjs/common';
import { GenresService } from './genres.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Genre } from './genres.types';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  /**
   * URL: /api/v1/genres
   * Returns all available genres.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getGenres(): Promise<Genre[]> {
    return this.genresService.getGenres();
  }
}
