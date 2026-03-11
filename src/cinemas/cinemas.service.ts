import { Injectable } from '@nestjs/common';
import type { Cinema } from '../database/schemas/cinemas.schema';
import type { CinemaResponse } from './cinemas.types';
import { mapCinemaDetail } from './cinemas.mapper';
import type { CreateCinemasBatchItemDto } from './dto/create-cinemas-batch.dto';
import type { UpdateCinemaDto } from './dto/update-cinema.dto';
import { CinemasRepository } from './cinemas.repository';
import { CitiesService } from '../cities/cities.service';

@Injectable()
export class CinemasService {
  constructor(
    private readonly repo: CinemasRepository,
    private readonly citiesService: CitiesService,
  ) {}

  // === READ ===

  async getCinemas(cityId?: number, citySlug?: string): Promise<Cinema[]> {
    const sourceCityId = await this.resolveSourceCityId(cityId, citySlug);
    return this.repo.findCinemasFlat(sourceCityId);
  }

  async getCinemaBySlug(slug: string): Promise<CinemaResponse | null> {
    const cinema = await this.repo.findBySlug(slug);
    if (!cinema) return null;
    return mapCinemaDetail(cinema);
  }

  // === WRITE ===

  async createCinemasBatch(
    cinemas: CreateCinemasBatchItemDto[],
  ): Promise<void> {
    return this.repo.upsertBatch(cinemas);
  }

  async updateCinemaBySlug(
    slug: string,
    data: UpdateCinemaDto,
  ): Promise<Cinema | null> {
    return this.repo.updateBySlug(slug, data);
  }

  // === PRIVATE ===

  private async resolveSourceCityId(
    cityId?: number,
    citySlug?: string,
  ): Promise<number | undefined> {
    if (!citySlug) return undefined;
    const city = await this.citiesService.findBySlug(citySlug);
    return city?.sourceId;
  }
}
