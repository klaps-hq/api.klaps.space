import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Genre } from '../database/schemas/genres.schema';
import type { GenreResponse } from '../lib/response-types';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getGenres(): Promise<Genre[]> {
    return this.genresService.getGenres();
  }

  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  async getGenreByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<GenreResponse> {
    const genre = await this.genresService.getGenreByIdOrSlug(idOrSlug);
    if (!genre) throw new NotFoundException(`Genre "${idOrSlug}" not found`);

    return genre;
  }

  @Post(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateGenreByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: UpdateGenreDto,
  ): Promise<Genre> {
    const genre = await this.genresService.updateGenreByIdOrSlug(
      idOrSlug,
      body,
    );

    if (!genre) throw new NotFoundException(`Genre "${idOrSlug}" not found`);
    return genre;
  }
}
