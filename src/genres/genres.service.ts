import { Injectable } from '@nestjs/common';
import type { Genre } from '../database/schemas/genres.schema';
import type { GenreResponse } from './genres.types';
import { mapGenre } from './genres.mapper';
import type { UpdateGenreDto } from './dto/update-genre.dto';
import { GenresRepository } from './genres.repository';

@Injectable()
export class GenresService {
  constructor(private readonly repo: GenresRepository) {}

  // === READ ===

  async getGenres(): Promise<Genre[]> {
    return this.repo.findAll();
  }

  async findBySlug(slug: string): Promise<Genre | null> {
    const genre = await this.repo.findBySlug(slug);
    return genre ?? null;
  }

  async getGenreBySlug(slug: string): Promise<GenreResponse | null> {
    const genre = await this.repo.findBySlug(slug);
    if (!genre) return null;
    return mapGenre(genre);
  }

  // === WRITE ===

  async updateGenreBySlug(
    slug: string,
    data: UpdateGenreDto,
  ): Promise<Genre | null> {
    return this.repo.updateBySlug(slug, data);
  }
}
