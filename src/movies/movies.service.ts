import { Injectable } from '@nestjs/common';
import type {
  GetMoviesParams,
  GetMultiCityMoviesParams,
  MovieSummaryResponse,
  MovieResponse,
  MultiCityMovieResponse,
} from './movies.types';
import type { CreateMoviesBatchItemDto } from './dto/create-movies-batch.dto';
import type { UpdateMovieDto } from './dto/update-movie.dto';
import type { PaginatedResponse } from '../lib/paginate';
import { parsePagination, paginate } from '../lib/paginate';
import { mapMovieSummary, mapMovieDetail } from './movies.mapper';
import { MoviesRepository } from './movies.repository';
import { GenresService } from '../genres/genres.service';
import { PAGINATION } from './movies.constants';

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

    const filter = {
      search: params?.search,
      genreId,
      directorId: params?.directorId,
    };

    if (!params?.limit) {
      const data = await this.repo.findAll(filter);
      const mapped = await this.mapWithUpdatedAt(data);
      return paginate(mapped, data.length, 1, data.length || 1);
    }

    const { page, limit, offset } = parsePagination(
      { page: params?.page, limit: params.limit },
      { limit: PAGINATION.DEFAULT_LIMIT },
    );

    const [data, total] = await Promise.all([
      this.repo.findAll({ ...filter, limit, offset }),
      this.repo.count(filter),
    ]);

    return paginate(await this.mapWithUpdatedAt(data), total, page, limit);
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
    return this.repo.upsertBatch(movies);
  }

  async updateMovieBySlug(
    slug: string,
    data: UpdateMovieDto,
  ): Promise<MovieResponse | null> {
    const movie = await this.repo.updateBySlug(slug, data);
    if (!movie) return null;
    return mapMovieDetail(movie);
  }

  // === PRIVATE ===

  private async mapWithUpdatedAt(
    data: Awaited<ReturnType<MoviesRepository['findAll']>>,
  ): Promise<MovieSummaryResponse[]> {
    const updatedAtByMovieId = await this.repo.findContentUpdatedAt(
      data.map((m) => m.id),
    );
    return data.map((m) => mapMovieSummary(m, updatedAtByMovieId.get(m.id)));
  }
}
