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
  MovieSummaryResponse,
  MovieResponse,
  MultiCityMovieResponse,
} from '../lib/response-types';
import { GetMultiCityMoviesQueryDto } from './dto/get-multi-city-movies-query.dto';
import { GetMoviesQueryDto } from './dto/get-movies-query.dto';
import { CreateMoviesBatchDto } from './dto/create-movies-batch.dto';

const MULTI_CITY_CACHE_TTL = 900_000;

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getMovies(
    @Query() query: GetMoviesQueryDto,
  ): Promise<MovieSummaryResponse[]> {
    return this.moviesService.getMovies({
      search: query.search,
      genreId: query.genreId,
      genreSlug: query.genreSlug,
    });
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
  @CacheTTL(MULTI_CITY_CACHE_TTL)
  getMultiCityMovies(
    @Query() query: GetMultiCityMoviesQueryDto,
  ): Promise<MultiCityMovieResponse[]> {
    return this.moviesService.getMultiCityMovies({
      limit: query.limit,
    });
  }

  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  async getMovieByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<MovieResponse> {
    const movie = await this.moviesService.getMovieByIdOrSlug(idOrSlug);
    if (!movie) {
      throw new NotFoundException(`Movie "${idOrSlug}" not found`);
    }

    return movie;
  }
}
