import { Injectable } from '@nestjs/common';
import type { Genre } from '../database/schemas/genres.schema';
import type { GenreResponse } from '../lib/response-types';
import { mapGenre } from '../lib/response-mappers';
import type { UpdateGenreDto } from './dto/update-genre.dto';
import { GenresRepository } from './genres.repository';

@Injectable()
export class GenresService {
  constructor(private readonly repo: GenresRepository) {}

  // === READ ===

  async getGenres(): Promise<Genre[]> {
    return this.repo.findAll();
  }

  async findByIdOrSlug(idOrSlug: string): Promise<Genre | null> {
    const genre = await this.repo.findByIdOrSlug(idOrSlug);
    return genre ?? null;
  }

  async getGenreByIdOrSlug(idOrSlug: string): Promise<GenreResponse | null> {
    const genre = await this.repo.findByIdOrSlug(idOrSlug);
    if (!genre) return null;
    return mapGenre(genre);
  }

  // === WRITE ===

  async updateGenreByIdOrSlug(
    idOrSlug: string,
    data: UpdateGenreDto,
  ): Promise<Genre | null> {
    return this.repo.updateByIdOrSlug(idOrSlug, data);
  }
}
