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
import type { CityDetailResponse, CityResponse } from '../lib/response-types';
import { CreateCityDto } from './dto/create-city.dto';
import { BatchCreateCitiesDto } from './dto/batch-create-cities.dto';
import { GetScrapedCitiesQueryDto } from './dto/get-scraped-cities-query.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  /**
   * @url /api/v1/cities
   * @description Get all cities.
   * @returns Cities.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCities(): Promise<City[]> {
    return this.citiesService.getCities();
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

  /**
   * @url /api/v1/cities/with-cinemas
   * @description Get all cities with at least one cinema.
   * @returns Cities with at least one cinema.
   */
  @Get('with-cinemas')
  @UseGuards(InternalApiKeyGuard)
  getCitiesWithCinemas(): Promise<CityResponse[]> {
    return this.citiesService.getCitiesWithCinemas();
  }

  /**
   * @url /api/v1/cities/:idOrSlug
   * @description Get city by ID or slug.
   * @param idOrSlug - City ID or slug.
   * @returns City.
   */
  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  async getCityByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<CityDetailResponse | null> {
    return await this.citiesService.getCityByIdOrSlug(idOrSlug);
  }

  /**
   * @url /api/v1/cities/batch
   * @description Create cities batch.
   * @param dto - Create cities dto.
   * @param dto.cities - Cities.
   * @returns Void.
   */
  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createCitiesBatch(@Body() dto: BatchCreateCitiesDto): Promise<void> {
    return this.citiesService.createCitiesBatch(dto.cities);
  }

  /**
   * @url /api/v1/cities/:idOrSlug
   * @description Update city by ID or slug.
   * @param id - City ID.
   * @param body - Update city body.
   * @param body.description - City description.
   * @returns City.
   */
  @Post(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  updateCityByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: { description?: string | null },
  ): Promise<City> {
    return this.citiesService.updateCityByIdOrSlug(idOrSlug, body);
  }
}
