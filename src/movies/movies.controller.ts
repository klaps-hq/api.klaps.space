import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { MoviesService } from './movies.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  MovieWithGenres,
  MultiCityMovie,
  PaginatedMoviesResponse,
} from './movies.types';
import { GetMultiCityMoviesQueryDto } from './dto/get-multi-city-movies-query.dto';
import { GetMoviesQueryDto } from './dto/get-movies-query.dto';

/** Cache TTL for multi-city movies endpoint: 15 minutes (in ms). */
const MULTI_CITY_CACHE_TTL = 900_000;

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  /**
   * URL: /api/v1/movies
   * Returns a paginated list of all movies with their genres.
   * Query params: page (default 1), limit (default 20, max 100).
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getMovies(
    @Query() query: GetMoviesQueryDto,
  ): Promise<PaginatedMoviesResponse> {
    return this.moviesService.getMovies({
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * URL: /api/v1/movies/multi-city
   * Returns movies with the largest territorial reach (most unique cities).
   * Query params: limit (default 5), minCities (default 2).
   */
  @Get('multi-city')
  @UseGuards(InternalApiKeyGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(MULTI_CITY_CACHE_TTL)
  getMultiCityMovies(
    @Query() query: GetMultiCityMoviesQueryDto,
  ): Promise<MultiCityMovie[]> {
    return this.moviesService.getMultiCityMovies({
      limit: query.limit,
      minCities: query.minCities,
    });
  }

  /**
   * URL: /api/v1/movies/:id
   * Returns a single movie by its id with genres.
   */
  @Get(':id')
  @UseGuards(InternalApiKeyGuard)
  async getMovieById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MovieWithGenres> {
    const movie = await this.moviesService.getMovieById(id);
    if (!movie) {
      throw new NotFoundException(`Movie with id ${id} not found`);
    }
    return movie;
  }
}
