import { Injectable } from '@nestjs/common';
import type { CinemaResponse, CinemaSummaryResponse } from './cinemas.types';
import { mapCinemaDetail, mapCinemaSummary } from './cinemas.mapper';
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

  async getCinemas(
    query: GetCinemasQueryDto,
  ): Promise<CinemaSummaryResponse[]> {
    const sourceCityId = await this.resolveSourceCityId(
      query.cityId,
      query.citySlug,
    );
    const cinemas = await this.repo.findAll(sourceCityId, query.limit);
    return cinemas.map(mapCinemaSummary);
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
  ): Promise<CinemaResponse | null> {
    const cinema = await this.repo.updateBySlug(slug, data);
    if (!cinema) return null;
    return mapCinemaDetail(cinema);
  }

  // === PRIVATE ===

  private async resolveSourceCityId(
    cityId?: number,
    citySlug?: string,
  ): Promise<number | undefined> {
    if (cityId) {
      const city = await this.citiesService.findById(cityId);
      return city?.sourceId;
    }
    if (citySlug) {
      const city = await this.citiesService.findBySlug(citySlug);
      return city?.sourceId;
    }
    return undefined;
  }
}
