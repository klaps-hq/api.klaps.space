import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Genre } from '../database/schemas/genres.schema';
import type { GenreResponse } from '../lib/response-types';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getGenres(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<Genre[]> {
    return this.genresService.getGenres({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateGenre(
    @Param('id') id: string,
    @Body() body: { description?: string | null },
  ): Promise<Genre> {
    const genre = await this.genresService.updateGenre(Number(id), body);
    if (!genre) throw new NotFoundException(`Genre "${id}" not found`);
    return genre;
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
