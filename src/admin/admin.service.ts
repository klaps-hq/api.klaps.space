import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import type { DeletableEntity, DeletePreview } from './admin.types';

@Injectable()
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  async getDeletePreview(
    entity: DeletableEntity,
    slug: string,
  ): Promise<DeletePreview> {
    const preview = await this.dispatchPreview(entity, slug);
    if (!preview) {
      throw new NotFoundException(`${entity} "${slug}" not found`);
    }
    return preview;
  }

  async deleteEntity(entity: DeletableEntity, slug: string): Promise<void> {
    const deleted = await this.dispatchDelete(entity, slug);
    if (!deleted) {
      throw new NotFoundException(`${entity} "${slug}" not found`);
    }
  }

  private dispatchPreview(
    entity: DeletableEntity,
    slug: string,
  ): Promise<DeletePreview | null> {
    switch (entity) {
      case 'movies':
        return this.repo.previewMovie(slug);
      case 'cinemas':
        return this.repo.previewCinema(slug);
      case 'cities':
        return this.repo.previewCity(slug);
      case 'genres':
        return this.repo.previewGenre(slug);
      case 'directors':
        return this.repo.previewDirector(slug);
    }
  }

  private dispatchDelete(
    entity: DeletableEntity,
    slug: string,
  ): Promise<{ name: string } | null> {
    switch (entity) {
      case 'movies':
        return this.repo.deleteMovie(slug);
      case 'cinemas':
        return this.repo.deleteCinema(slug);
      case 'cities':
        return this.repo.deleteCity(slug);
      case 'genres':
        return this.repo.deleteGenre(slug);
      case 'directors':
        return this.repo.deleteDirector(slug);
    }
  }
}
