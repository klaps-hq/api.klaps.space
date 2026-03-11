import { Injectable } from '@nestjs/common';
import type { Cinema } from '../database/schemas/cinemas.schema';
import type { CinemaResponse } from './cinemas.types';
import { mapCinemaDetail } from './cinemas.mapper';
import type { CreateCinemasBatchItemDto } from './dto/create-cinemas-batch.dto';
import type { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';
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

  async getCinemas(query: GetCinemasQueryDto): Promise<Cinema[]> {
    const sourceCityId = await this.resolveSourceCityId(query.citySlug);
    return this.repo.findAll(sourceCityId);
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
    citySlug?: string,
  ): Promise<number | undefined> {
    if (!citySlug) return undefined;
    const city = await this.citiesService.findBySlug(citySlug);
    return city?.sourceId;
  }
}
