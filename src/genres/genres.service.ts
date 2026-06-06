import { Injectable } from '@nestjs/common';
import type { GenreResponse } from './genres.types';
import { mapGenre } from './genres.mapper';
import type { UpdateGenreDto } from './dto/update-genre.dto';
import { GenresRepository } from './genres.repository';

@Injectable()
export class GenresService {
  constructor(private readonly repo: GenresRepository) {}

  // === READ ===

  async getGenres(): Promise<GenreResponse[]> {
    const [genres, updatedAtByGenreId] = await Promise.all([
      this.repo.findAll(),
      this.repo.findContentUpdatedAt(),
    ]);
    return genres.map((g) => mapGenre(g, updatedAtByGenreId.get(g.id)));
  }

  async findBySlug(slug: string) {
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
  ): Promise<GenreResponse | null> {
    const genre = await this.repo.updateBySlug(slug, data);
    if (!genre) return null;
    return mapGenre(genre);
  }
}
