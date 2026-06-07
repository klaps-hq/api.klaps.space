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
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { MoviesService } from './movies.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  MovieResponse,
  MultiCityMovieResponse,
  MovieSummaryResponse,
} from './movies.types';
import type { PaginatedResponse } from '../lib/paginate';
import { GetMultiCityMoviesQueryDto } from './dto/get-multi-city-movies-query.dto';
import { GetMoviesQueryDto } from './dto/get-movies-query.dto';
import { CreateMoviesBatchDto } from './dto/create-movies-batch.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { CACHE_TTL } from './movies.constants';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getMovies(
    @Query() query: GetMoviesQueryDto,
  ): Promise<PaginatedResponse<MovieSummaryResponse>> {
    return this.moviesService.getMovies(query);
  }

  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createMoviesBatch(@Body() dto: CreateMoviesBatchDto): Promise<void> {
    return this.moviesService.createMoviesBatch(dto.movies);
  }

  @Get('multi-city')
  @UseGuards(InternalApiKeyGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_TTL.MULTI_CITY_MS)
  getMultiCityMovies(
    @Query() query: GetMultiCityMoviesQueryDto,
  ): Promise<MultiCityMovieResponse[]> {
    return this.moviesService.getMultiCityMovies(query);
  }

  @Get(':slug')
  @UseGuards(InternalApiKeyGuard)
  async getMovieBySlug(@Param('slug') slug: string): Promise<MovieResponse> {
    const movie = await this.moviesService.getMovieBySlug(slug);
    if (!movie) {
      throw new NotFoundException(`Movie "${slug}" not found`);
    }

    return movie;
  }

  @Post(':slug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateMovieBySlug(
    @Param('slug') slug: string,
    @Body() body: UpdateMovieDto,
  ): Promise<MovieResponse> {
    const movie = await this.moviesService.updateMovieBySlug(slug, body);
    if (!movie) {
      throw new NotFoundException(`Movie "${slug}" not found`);
    }

    return movie;
  }
}
