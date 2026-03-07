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
import { CinemasService } from './cinemas.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Cinema } from '../database/schemas/cinemas.schema';
import type { CinemaGroupResponse, CinemaResponse } from '../lib/response-types';
import { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';
import { CreateCinemaDto } from './dto/create-cinema.dto';
import { BatchCreateCinemasDto } from './dto/batch-create-cinemas.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  /**
   * URL: /api/v1/cinemas
   * Returns a flat paginated list of cinemas (raw DB rows).
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCinemas(
    @Query() query: GetCinemasQueryDto,
  ): Promise<{ data: CinemaGroupResponse[] } | { data: Cinema[] }> {
    return this.cinemasService.getCinemas({
      cityId: query.cityId,
      citySlug: query.citySlug,
      limit: query.limit,
      page: query.page,
      flat: query.flat,
    });
  }

  /**
   * URL: /api/v1/cinemas
   * Creates or updates a cinema (upserts on duplicate sourceId).
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
   * Updates mutable fields (e.g. description) on a cinema.
   */
  @Post(':id')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateCinema(
    @Param('id') id: string,
    @Body() body: { description?: string | null },
  ): Promise<Cinema> {
    const cinema = await this.cinemasService.updateCinema(Number(id), body);
    if (!cinema) throw new NotFoundException(`Cinema "${id}" not found`);
    return cinema;
  }

  /**
   * URL: /api/v1/cinemas/:idOrSlug
   * Returns a single cinema by numeric id or slug.
   */
  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  async getCinemaByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<CinemaResponse> {
    const cinema = await this.cinemasService.getCinemaByIdOrSlug(idOrSlug);
    if (!cinema) {
      throw new NotFoundException(`Cinema "${idOrSlug}" not found`);
    }
    return cinema;
  }
}
