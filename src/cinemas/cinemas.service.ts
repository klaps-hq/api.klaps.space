import { Injectable } from '@nestjs/common';
import type { CinemaResponse, CinemaSummaryResponse } from './cinemas.types';
import {
  mapCinemaDetail,
  mapCinemaDetails,
  mapCinemaSummary,
} from './cinemas.mapper';
import type { CreateCinemasBatchItemDto } from './dto/create-cinemas-batch.dto';
import type { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';
import {
  CINEMA_DETAIL_FIELDS,
  type UpdateCinemaDto,
} from './dto/update-cinema.dto';
import type { SetCinemaPhotosDto } from './dto/set-cinema-photos.dto';
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
    const cinemas = await this.repo.findAll(
      sourceCityId,
      query.limit,
      query.openAir,
    );
    if (cinemas.length === 0) return [];

    const [updatedAtBySourceId, updatedAtBySourceCityId] = await Promise.all([
      this.repo.findContentUpdatedAt(cinemas.map((c) => c.sourceId)),
      this.repo.findCityContentUpdatedAt([
        ...new Set(cinemas.map((c) => c.sourceCityId)),
      ]),
    ]);

    // The cinema list also carries coordinates (map in the admin panel);
    // screenings do not need them.
    return cinemas.map((c) => ({
      ...mapCinemaSummary(
        c,
        updatedAtBySourceId.get(c.sourceId),
        updatedAtBySourceCityId.get(c.sourceCityId),
      ),
      latitude: c.latitude,
      longitude: c.longitude,
      // City pages compare their venues (rooms, accessibility); the full
      // nationwide list stays lean.
      ...(sourceCityId !== undefined && { details: mapCinemaDetails(c) }),
    }));
  }

  async searchCinemas(
    query: string,
    limit: number,
  ): Promise<CinemaSummaryResponse[]> {
    const cinemas = await this.repo.searchByName(query, limit);
    return cinemas.map((c) => mapCinemaSummary(c));
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
    const touchesDetails = CINEMA_DETAIL_FIELDS.some((f) => f in data);
    const cinema = await this.repo.updateBySlug(
      slug,
      touchesDetails ? { ...data, detailsUpdatedAt: new Date() } : data,
    );
    if (!cinema) return null;
    return mapCinemaDetail(cinema);
  }

  async setCinemaPhotosBySlug(
    slug: string,
    { photos }: SetCinemaPhotosDto,
  ): Promise<CinemaResponse | null> {
    const cinema = await this.repo.updateBySlug(slug, {
      photos: photos.length > 0 ? photos : null,
      detailsUpdatedAt: new Date(),
    });
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
