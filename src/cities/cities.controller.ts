import { Controller, Get, UseGuards } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import type { City } from './cities.types';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  /**
   * Returns all cities.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCities(): Promise<City[]> {
    return this.citiesService.getCities();
  }
}
