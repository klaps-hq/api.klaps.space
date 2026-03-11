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
import type { GenreResponse } from './genres.types';
import { UpdateGenreDto } from './dto/update-genre.dto';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getGenres(): Promise<GenreResponse[]> {
    return this.genresService.getGenres();
  }

  @Get(':slug')
  @UseGuards(InternalApiKeyGuard)
  async getGenreBySlug(@Param('slug') slug: string): Promise<GenreResponse> {
    const genre = await this.genresService.getGenreBySlug(slug);
    if (!genre) throw new NotFoundException(`Genre "${slug}" not found`);

    return genre;
  }

  @Post(':slug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateGenreBySlug(
    @Param('slug') slug: string,
    @Body() body: UpdateGenreDto,
  ): Promise<GenreResponse> {
    const genre = await this.genresService.updateGenreBySlug(slug, body);

    if (!genre) throw new NotFoundException(`Genre "${slug}" not found`);
    return genre;
  }
}
