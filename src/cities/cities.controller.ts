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
import type { CityDetailResponse, CityResponse } from './cities.types';
import { CreateCitiesBatchDto } from './dto/create-cities-batch.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { GetScrapedCitiesQueryDto } from './dto/get-scraped-cities-query.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCities(): Promise<City[]> {
    return this.citiesService.getCities();
  }

  @Get('scraped')
  @UseGuards(InternalApiKeyGuard)
  getScrapedCities(
    @Query() query: GetScrapedCitiesQueryDto,
  ): Promise<number[]> {
    return this.citiesService.getScrapedCities(query);
  }

  @Get('with-cinemas')
  @UseGuards(InternalApiKeyGuard)
  getCitiesWithCinemas(): Promise<CityResponse[]> {
    return this.citiesService.getCitiesWithCinemas();
  }

  @Get(':slug')
  @UseGuards(InternalApiKeyGuard)
  async getCityBySlug(
    @Param('slug') slug: string,
  ): Promise<CityDetailResponse> {
    const city = await this.citiesService.getCityBySlug(slug);
    if (!city) throw new NotFoundException(`City "${slug}" not found`);
    return city;
  }

  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createCitiesBatch(@Body() dto: CreateCitiesBatchDto): Promise<void> {
    return this.citiesService.createCitiesBatch(dto.cities);
  }

  @Post(':slug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateCityBySlug(
    @Param('slug') slug: string,
    @Body() body: UpdateCityDto,
  ): Promise<City> {
    const city = await this.citiesService.updateCityBySlug(slug, body);
    if (!city) throw new NotFoundException(`City "${slug}" not found`);
    return city;
  }
}
