import { Injectable } from '@nestjs/common';
import type { DirectorResponse, GetDirectorsParams } from './directors.types';
import type { PaginatedResponse } from '../lib/paginate';
import { paginate, parsePagination } from '../lib/paginate';
import { mapDirector } from './directors.mapper';
import { DirectorsRepository } from './directors.repository';
import { PAGINATION } from './directors.constants';
import type { UpdateDirectorDto } from './dto/update-director.dto';

@Injectable()
export class DirectorsService {
  constructor(private readonly repo: DirectorsRepository) {}

  // === READ ===

  async getDirectors(
    params?: GetDirectorsParams,
  ): Promise<PaginatedResponse<DirectorResponse>> {
    const filter = { search: params?.search };

    if (!params?.limit) {
      const data = await this.repo.findAll(filter);
      const mapped = await this.mapWithStats(data);
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

    return paginate(await this.mapWithStats(data), total, page, limit);
  }

  async getDirectorBySlug(slug: string): Promise<DirectorResponse | null> {
    const director = await this.repo.findBySlug(slug);
    if (!director) return null;
    const [mapped] = await this.mapWithStats([director]);
    return mapped;
  }

  // === WRITE ===

  async updateDirectorBySlug(
    slug: string,
    data: UpdateDirectorDto,
  ): Promise<DirectorResponse | null> {
    const director = await this.repo.updateBySlug(slug, data);
    if (!director) return null;
    const [mapped] = await this.mapWithStats([director]);
    return mapped;
  }

  // === PRIVATE ===

  private async mapWithStats(
    data: Awaited<ReturnType<DirectorsRepository['findAll']>>,
  ): Promise<DirectorResponse[]> {
    const ids = data.map((d) => d.id);
    const [stats, updatedAtById] = await Promise.all([
      this.repo.findStats(ids),
      this.repo.findContentUpdatedAt(ids),
    ]);
    return data.map((d) =>
      mapDirector(
        d,
        stats.get(d.id) ?? { moviesCount: 0, upcomingScreeningsCount: 0 },
        updatedAtById.get(d.id) ?? null,
      ),
    );
  }
}
