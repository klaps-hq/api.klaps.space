import { Injectable } from '@nestjs/common';
import type { City } from './cities.types';
import type { CreateCitiesBatchItemDto } from './dto/create-cities-batch.dto';
import type { UpdateCityDto } from './dto/update-city.dto';
import type { GetScrapedCitiesQueryDto } from './dto/get-scraped-cities-query.dto';
import type { CityDetailResponse, CityResponse } from '../lib/response-types';
import { mapCity } from '../lib/response-mappers';
import { ScreeningsService } from '../screenings/screenings.service';
import { CitiesRepository } from './cities.repository';

@Injectable()
export class CitiesService {
  constructor(
    private readonly repo: CitiesRepository,
    private readonly screeningsService: ScreeningsService,
  ) {}

  // === READ ===

  async getCities(): Promise<City[]> {
    return this.repo.findAll();
  }

  async findByIdOrSlug(idOrSlug: string): Promise<City | null> {
    const city = await this.repo.findByIdOrSlug(idOrSlug);
    return city ?? null;
  }

  async getCitiesWithCinemas(): Promise<CityResponse[]> {
    const cities = await this.repo.findWithCinemaCount();
    return cities.map((c) => mapCity(c, c.numberOfCinemas));
  }

  async getCityByIdOrSlug(
    idOrSlug: string,
  ): Promise<CityDetailResponse | null> {
    const city = await this.repo.findByIdOrSlug(idOrSlug);
    if (!city) return null;

    const [screenings, numberOfCinemas] = await Promise.all([
      this.screeningsService.getScreenings({ cityId: city.id }),
      this.repo.countCinemasBySourceId(city.sourceId),
    ]);

    return {
      city: mapCity(city, numberOfCinemas),
      screenings,
    };
  }

  async getScrapedCities(query: GetScrapedCitiesQueryDto): Promise<number[]> {
    const { dateFrom, dateTo, cityId, citySlug } = query;
    const startDay = dateFrom ? new Date(dateFrom) : new Date();
    const endDay = dateTo ? new Date(dateTo) : new Date();

    return this.repo.findScrapedCityIds(startDay, endDay, cityId, citySlug);
  }

  // === WRITE ===

  async createCitiesBatch(cities: CreateCitiesBatchItemDto[]): Promise<void> {
    return this.repo.upsertBatch(cities);
  }

  async updateCityByIdOrSlug(
    idOrSlug: string,
    data: UpdateCityDto,
  ): Promise<City | null> {
    return this.repo.updateByIdOrSlug(idOrSlug, data);
  }
}
