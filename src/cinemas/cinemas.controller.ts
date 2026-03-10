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
import type {
  CinemaGroupResponse,
  CinemaResponse,
} from '../lib/response-types';
import { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';
import { CreateCinemasBatchDto } from './dto/create-cinemas-batch.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCinemas(
    @Query() query: GetCinemasQueryDto,
  ): Promise<{ data: CinemaGroupResponse[] } | { data: Cinema[] }> {
    return this.cinemasService.getCinemas(query);
  }

  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  async getCinemaByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<CinemaResponse> {
    const cinema = await this.cinemasService.getCinemaByIdOrSlug(idOrSlug);
    if (!cinema) throw new NotFoundException(`Cinema "${idOrSlug}" not found`);

    return cinema;
  }

  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createCinemasBatch(@Body() dto: CreateCinemasBatchDto): Promise<void> {
    return this.cinemasService.createCinemasBatch(dto.cinemas);
  }

  @Post(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateCinemaByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: UpdateCinemaDto,
  ): Promise<Cinema> {
    const cinema = await this.cinemasService.updateCinemaByIdOrSlug(
      idOrSlug,
      body,
    );

    if (!cinema) throw new NotFoundException(`Cinema "${idOrSlug}" not found`);
    return cinema;
  }
}
