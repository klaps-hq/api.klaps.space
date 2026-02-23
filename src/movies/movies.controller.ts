import {
  Body,
  Controller,
  Get,
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
import type { Movie } from './movies.types';
import type {
  MovieSummaryResponse,
  MovieResponse,
  MultiCityMovieResponse,
  PaginatedResponse,
} from '../lib/response-types';
import { GetMultiCityMoviesQueryDto } from './dto/get-multi-city-movies-query.dto';
import { GetMoviesQueryDto } from './dto/get-movies-query.dto';
import { CreateMovieDto } from './dto/create-movie.dto';

/** Cache TTL for multi-city movies endpoint: 15 minutes (in ms). */
const MULTI_CITY_CACHE_TTL = 900_000;

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  /**
   * URL: /api/v1/movies
   * Returns a paginated list of all movies (MovieSummaryResponse).
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getMovies(
    @Query() query: GetMoviesQueryDto,
  ): Promise<PaginatedResponse<MovieSummaryResponse>> {
    return this.moviesService.getMovies({
      search: query.search,
      genreId: query.genreId,
      genreSlug: query.genreSlug,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * URL: /api/v1/movies
   * Creates a new movie.
   */
  @Post()
  @UseGuards(InternalApiKeyGuard)
  createMovie(@Body() dto: CreateMovieDto): Promise<Movie> {
    return this.moviesService.createMovie(dto);
  }

  /**
   * URL: /api/v1/movies/multi-city
   * Returns movies with the largest territorial reach (most unique cities).
   */
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

  /**
   * URL: /api/v1/movies/:idOrSlug
   * Returns a single movie by its numeric id or slug.
   */
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
