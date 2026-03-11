import { Injectable } from '@nestjs/common';
import type {
  GetMoviesParams,
  GetMultiCityMoviesParams,
  MovieSummaryResponse,
  MovieResponse,
  MultiCityMovieResponse,
} from './movies.types';
import type { CreateMoviesBatchItemDto } from './dto/create-movies-batch.dto';
import { mapMovieSummary, mapMovieDetail } from './movies.mapper';
import { MoviesRepository } from './movies.repository';
import { MoviesBatchService } from './movies-batch.service';
import { GenresService } from '../genres/genres.service';

@Injectable()
export class MoviesService {
  constructor(
    private readonly repo: MoviesRepository,
    private readonly batchService: MoviesBatchService,
    private readonly genresService: GenresService,
  ) {}

  // === READ ===

  async getMovies(params?: GetMoviesParams): Promise<MovieSummaryResponse[]> {
    let genreId = params?.genreId;
    if (!genreId && params?.genreSlug) {
      const genre = await this.genresService.findBySlug(params.genreSlug);
      genreId = genre?.id;
    }
    const data = await this.repo.findMovies({
      search: params?.search,
      genreId,
    });
    return data.map(mapMovieSummary);
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
    return this.batchService.createBatch(movies);
  }
}
