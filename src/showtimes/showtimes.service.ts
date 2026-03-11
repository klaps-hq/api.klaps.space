import { Injectable } from '@nestjs/common';
import type { Showtime } from './showtimes.types';
import type { GetShowtimesQueryDto } from './dto/get-showtimes-query.dto';
import type { CreateShowtimesBatchDto } from './dto/create-showtimes-batch.dto';
import { ShowtimesRepository } from './showtimes.repository';
import { CitiesService } from '../cities/cities.service';

@Injectable()
export class ShowtimesService {
  constructor(
    private readonly repo: ShowtimesRepository,
    private readonly citiesService: CitiesService,
  ) {}

  // === READ ===

  async getShowtimes(query: GetShowtimesQueryDto): Promise<Showtime[]> {
    const { dateFrom, dateTo, cityId, citySlug } = query;
    const startDay = dateFrom ? new Date(dateFrom) : new Date();
    const endDay = dateTo ? new Date(dateTo) : new Date();

    const resolvedCityId = cityId ?? (await this.resolveCityId(citySlug));

    return this.repo.findShowtimes(startDay, endDay, resolvedCityId);
  }

  // === WRITE ===

  async createShowtimesBatch(dto: CreateShowtimesBatchDto): Promise<void> {
    const { showtimes, scrapedCityIds } = dto;
    if (showtimes.length === 0) return;

    await this.repo.insertBatch(showtimes);

    if (scrapedCityIds && scrapedCityIds.length > 0) {
      await this.repo.updateCitiesLastScrapedAt(scrapedCityIds);
    }
  }

  // === PRIVATE ===

  private async resolveCityId(citySlug?: string): Promise<number | undefined> {
    if (!citySlug) return undefined;
    const city = await this.citiesService.findByIdOrSlug(citySlug);
    return city?.id;
  }
}
