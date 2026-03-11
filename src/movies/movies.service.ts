import { Injectable } from '@nestjs/common';
import type {
  GetMoviesParams,
  GetMultiCityMoviesParams,
  MovieSummaryResponse,
  MovieResponse,
  MultiCityMovieResponse,
} from './movies.types';
import type { CreateMoviesBatchItemDto } from './dto/create-movies-batch.dto';
import type { PaginatedResponse } from '../lib/paginate';
import { parsePagination, paginate } from '../lib/paginate';
import { mapMovieSummary, mapMovieDetail } from './movies.mapper';
import { MoviesRepository } from './movies.repository';
import { GenresService } from '../genres/genres.service';

const DEFAULT_MOVIES_LIMIT = 20;
const MAX_MOVIES_LIMIT = 100;

@Injectable()
export class MoviesService {
  constructor(
    private readonly repo: MoviesRepository,
    private readonly genresService: GenresService,
  ) {}

  // === READ ===

  async getMovies(
    params?: GetMoviesParams,
  ): Promise<PaginatedResponse<MovieSummaryResponse>> {
    let genreId = params?.genreId;
    if (!genreId && params?.genreSlug) {
      const genre = await this.genresService.findBySlug(params.genreSlug);
      genreId = genre?.id;
    }

    const { page, limit, offset } = parsePagination(
      { page: params?.page, limit: params?.limit },
      { limit: DEFAULT_MOVIES_LIMIT, maxLimit: MAX_MOVIES_LIMIT },
    );

    const filter = { search: params?.search, genreId };

    const [data, total] = await Promise.all([
      this.repo.findMovies({ ...filter, limit, offset }),
      this.repo.countMovies(filter),
    ]);

    return paginate(data.map(mapMovieSummary), total, page, limit);
  }

  async getMovieBySlug(slug: string): Promise<MovieResponse | null> {
    const movie = await this.repo.findBySlug(slug);
    if (!movie) return null;
    return mapMovieDetail(movie);
  }

  async getMultiCityMovies(
    params?: GetMultiCityMoviesParams,
  ): Promise<MultiCityMovieResponse[]> {
    return this.repo.findMultiCityMovies(params);
  }

  // === WRITE ===

  async createMoviesBatch(movies: CreateMoviesBatchItemDto[]): Promise<void> {
    return this.repo.createBatch(movies);
  }
}
