import { Injectable } from '@nestjs/common';
import type { Cinema } from '../database/schemas/cinemas.schema';
import type {
  CinemaGroupResponse,
  CinemaResponse,
} from '../lib/response-types';
import { mapCity, mapCinemaDetail } from '../lib/response-mappers';
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

  async getCinemasGroupedByCity(
    cityId?: number,
    citySlug?: string,
  ): Promise<CinemaGroupResponse[]> {
    const sourceCityId = await this.resolveSourceCityId(cityId, citySlug);
    const cinemas = await this.repo.findCinemasWithCity(sourceCityId);

    const grouped = new Map<number, CinemaGroupResponse>();
    for (const cinema of cinemas) {
      const cId = cinema.city?.id ?? 0;
      const existing = grouped.get(cId);
      const cinemaSummary = {
        id: cinema.id,
        slug: cinema.slug,
        name: cinema.name,
        street: cinema.street,
      };
      if (existing) {
        existing.cinemas.push(cinemaSummary);
      } else {
        grouped.set(cId, {
          city: cinema.city
            ? mapCity(cinema.city)
            : {
                id: 0,
                slug: '',
                name: '',
                nameDeclinated: '',
                description: null,
              },
          cinemas: [cinemaSummary],
        });
      }
    }

    return [...grouped.values()].sort(
      (a, b) => b.cinemas.length - a.cinemas.length,
    );
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
