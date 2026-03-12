import { Injectable } from '@nestjs/common';
import type { ShowtimeResponse } from './showtimes.types';
import type { GetShowtimesQueryDto } from './dto/get-showtimes-query.dto';
import type { CreateShowtimesBatchDto } from './dto/create-showtimes-batch.dto';
import { mapShowtime } from './showtimes.mapper';
import { ShowtimesRepository } from './showtimes.repository';
import { CitiesService } from '../cities/cities.service';
import { getDateRangeUpToMonthFromNow } from '../lib/date';

@Injectable()
export class ShowtimesService {
  constructor(
    private readonly repo: ShowtimesRepository,
    private readonly citiesService: CitiesService,
  ) {}

  // === READ ===

  async getShowtimes(query: GetShowtimesQueryDto): Promise<ShowtimeResponse[]> {
    const { dateFrom, dateTo, cityId, citySlug } = query;
    const { startDay, endDay } = getDateRangeUpToMonthFromNow(dateFrom, dateTo);

    const resolvedCityId = cityId ?? (await this.resolveCityId(citySlug));
    const showtimes = await this.repo.findAll(startDay, endDay, resolvedCityId);

    return showtimes.map(mapShowtime);
  }

  // === WRITE ===

  async createShowtimesBatch(dto: CreateShowtimesBatchDto): Promise<void> {
    const { showtimes, scrapedCityIds } = dto;
    if (showtimes.length === 0) return;

    await this.repo.upsertBatch(showtimes);

    if (scrapedCityIds && scrapedCityIds.length > 0) {
      await this.repo.updateCitiesLastScrapedAt(scrapedCityIds);
    }
  }

  // === PRIVATE ===

  private async resolveCityId(citySlug?: string): Promise<number | undefined> {
    if (!citySlug) return undefined;
    const city = await this.citiesService.findBySlug(citySlug);
    return city?.id;
  }
}
