import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { City } from './cities.types';
import { CreateCityDto } from './dto/create-city.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  /**
   * URL: /api/v1/cities
   * Returns all cities.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCities(): Promise<City[]> {
    return this.citiesService.getCities();
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
