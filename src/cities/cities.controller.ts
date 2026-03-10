import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CitiesService } from './cities.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { City } from './cities.types';
import type { CityDetailResponse } from '../lib/response-types';
import { CreateCityDto } from './dto/create-city.dto';
import { BatchCreateCitiesDto } from './dto/batch-create-cities.dto';
import { GetScrapedCitiesQueryDto } from './dto/get-scraped-cities-query.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCities(): Promise<City[]> {
    return this.citiesService.getCities();
  }

  @Get('with-cinemas')
  @UseGuards(InternalApiKeyGuard)
  getCitiesWithCinemas(): Promise<(City & { numberOfCinemas: number })[]> {
    return this.citiesService.getCitiesWithCinemas();
  }

  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  async getCityByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<CityDetailResponse> {
    const city = await this.citiesService.getCityByIdOrSlug(idOrSlug);

    if (!city) {
      throw new NotFoundException(`City "${idOrSlug}" not found`);
    }

    return city;
  }

  /**
   * URL: /api/v1/cities/batch
   * Bulk upserts cities in a single transaction.
   */
  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  batchCreateCities(
    @Body() dto: BatchCreateCitiesDto,
  ): Promise<{ count: number }> {
    return this.citiesService.batchCreateCities(dto.cities);
  }

  /**
   * URL: /api/v1/cities/:id
   * Updates mutable fields (e.g. description) on a city.
   */
  @Post(':id')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateCity(
    @Param('id') id: string,
    @Body() body: { description?: string | null },
  ): Promise<City> {
    const city = await this.citiesService.updateCity(Number(id), body);
    if (!city) throw new NotFoundException(`City "${id}" not found`);
    return city;
  }

  /**
   * URL: /api/v1/cities
   * Creates a new city.
   */
  @Post()
  @UseGuards(InternalApiKeyGuard)
  createCity(@Body() dto: CreateCityDto): Promise<City> {
    return this.citiesService.createCity(dto);
  }

  /**
   * @description Get scraped cities.
   * @param query.dateFrom - Start date.
   * @param query.dateTo - End date.
   * @param query.cityId - City ID.
   * @param query.citySlug - City slug.
   * @returns Scraped cities IDs.
   */
  @Get('scraped')
  @UseGuards(InternalApiKeyGuard)
  async getScrapedCities(
    @Query() query: GetScrapedCitiesQueryDto,
  ): Promise<number[]> {
    return this.citiesService.getScrapedCities(query);
  }
}
