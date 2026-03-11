import { Injectable } from '@nestjs/common';
import type { City, CityDetailResponse, CityResponse } from './cities.types';
import type { CreateCitiesBatchItemDto } from './dto/create-cities-batch.dto';
import type { UpdateCityDto } from './dto/update-city.dto';
import type { GetScrapedCitiesQueryDto } from './dto/get-scraped-cities-query.dto';
import { mapCity } from './cities.mapper';
import { ScreeningsService } from '../screenings/screenings.service';
import { CitiesRepository } from './cities.repository';

@Injectable()
export class CitiesService {
  constructor(
    private readonly repo: CitiesRepository,
    private readonly screeningsService: ScreeningsService,
  ) {}

  // === READ ===

  async getCities(): Promise<CityResponse[]> {
    const cities = await this.repo.findAll();
    return cities.map((c) => mapCity(c));
  }

  async findBySlug(slug: string): Promise<City | null> {
    const city = await this.repo.findBySlug(slug);
    return city ?? null;
  }

  async getCitiesWithCinemas(): Promise<CityResponse[]> {
    const cities = await this.repo.findWithCinemaCount();
    return cities.map((c) => mapCity(c, c.numberOfCinemas));
  }

  async getCityBySlug(slug: string): Promise<CityDetailResponse | null> {
    const city = await this.repo.findBySlug(slug);
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

  async updateCityBySlug(
    slug: string,
    data: UpdateCityDto,
  ): Promise<CityResponse | null> {
    const city = await this.repo.updateBySlug(slug, data);
    if (!city) return null;
    return mapCity(city);
  }
}
