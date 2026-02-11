import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CitiesService } from './cities.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { City } from './cities.types';
import type { CityDetailResponse, CityResponse } from '../lib/response-types';
import { CreateCityDto } from './dto/create-city.dto';
import { BatchCreateCitiesDto } from './dto/batch-create-cities.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  /**
   * URL: /api/v1/cities
   * Returns all cities (clean, no DB internals).
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCities(): Promise<CityResponse[]> {
    return this.citiesService.getCities();
  }

  @Get(':id')
  @UseGuards(InternalApiKeyGuard)
  async getCityById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CityDetailResponse> {
    const city = await this.citiesService.getCityById(id);
    if (!city) {
      throw new NotFoundException(`City with id ${id} not found`);
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
   * URL: /api/v1/cities
   * Creates a new city.
   */
  @Post()
  @UseGuards(InternalApiKeyGuard)
  createCity(@Body() dto: CreateCityDto): Promise<City> {
    return this.citiesService.createCity(dto);
  }
}
