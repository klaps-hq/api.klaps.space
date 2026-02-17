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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Cinema } from '../database/schemas/cinemas.schema';
import type {
  CinemaGroupResponse,
  CinemaResponse,
} from '../lib/response-types';
import { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { BatchCreateCinemasDto } from './dto/batch-create-cinemas.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  /**
   * URL: /api/v1/cinemas
   * Returns cinemas pre-grouped by city.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCinemas(
    @Query() query: GetCinemasQueryDto,
  ): Promise<{ data: CinemaGroupResponse[] }> {
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
   * URL: /api/v1/cinemas/batch
   * Bulk upserts cinemas in a single transaction.
   */
  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  batchCreateCinemas(
    @Body() dto: BatchCreateCinemasDto,
  ): Promise<{ count: number }> {
    return this.cinemasService.batchCreateCinemas(dto.cinemas);
  }

  /**
   * URL: /api/v1/cinemas/:id
   * Returns a single cinema with nested city, stripped of DB internals.
   */
  @Get(':id')
  @UseGuards(InternalApiKeyGuard)
  async getCinemaById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CinemaResponse> {
    const cinema = await this.cinemasService.getCinemaById(id);
    if (!cinema) {
      throw new NotFoundException(`Cinema with id ${id} not found`);
    }
    return cinema;
  }
}
