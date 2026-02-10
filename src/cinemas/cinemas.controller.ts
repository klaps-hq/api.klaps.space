import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { CinemaWithCityName } from './cinemas.types';
import type { Cinema } from '../database/schemas/cinemas.schema';
import { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';
import { CreateCinemaDto } from './dto/create-cinema.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  /**
   * URL: /api/v1/cinemas
   * Returns cinemas, optionally filtered by cityId, with a configurable limit.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCinemas(
    @Query() query: GetCinemasQueryDto,
  ): Promise<CinemaWithCityName[]> {
    return this.cinemasService.getCinemas({
      cityId: query.cityId,
      limit: query.limit,
    });
  }

  /**
   * URL: /api/v1/cinemas
   * Creates or updates a cinema (upserts on duplicate filmwebId).
   */
  @Post()
  @UseGuards(InternalApiKeyGuard)
  createCinema(@Body() dto: CreateCinemaDto): Promise<Cinema> {
    return this.cinemasService.createCinema(dto);
  }

  /**
   * URL: /api/v1/cinemas/:id
   * Returns a single cinema by its id.
   */
  @Get(':id')
  @UseGuards(InternalApiKeyGuard)
  async getCinemaById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CinemaWithCityName> {
    const cinema = await this.cinemasService.getCinemaById(id);
    if (!cinema) {
      throw new NotFoundException(`Cinema with id ${id} not found`);
    }
    return cinema;
  }
}
