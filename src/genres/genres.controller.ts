import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GenresService } from './genres.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Genre } from '../database/schemas/genres.schema';
import type { GenreResponse } from '../lib/response-types';
import { GetGenresDto } from './dto/get-genres.dto';
import { PostGenreDto } from './dto/post-genres.dto';

@Controller('genres')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getGenres(@Query() query: GetGenresDto): Promise<Genre[]> {
    return this.genresService.getGenres(query);
  }

  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  getGenreByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<GenreResponse> {
    return this.genresService.getGenreByIdOrSlug(idOrSlug);
  }

  @Post(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  updateGenreByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: PostGenreDto,
  ): Promise<Genre> {
    return this.genresService.updateGenreByIdOrSlug(idOrSlug, body);
  }
}
