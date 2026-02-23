import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { GenreResponse } from '../lib/response-types';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getGenres(): Promise<GenreResponse[]> {
    return this.genresService.getGenres();
  }

  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  async getGenreByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<GenreResponse> {
    const genre = await this.genresService.getGenreByIdOrSlug(idOrSlug);
    if (!genre) {
      throw new NotFoundException(`Genre "${idOrSlug}" not found`);
    }
    return genre;
  }
}
