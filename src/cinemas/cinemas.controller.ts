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
import type { CinemaResponse } from './cinemas.types';
import { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';
import { CreateCinemasBatchDto } from './dto/create-cinemas-batch.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCinemas(@Query() query: GetCinemasQueryDto): Promise<Cinema[]> {
    return this.cinemasService.getCinemas(query.cityId, query.citySlug);
  }

  @Get(':slug')
  @UseGuards(InternalApiKeyGuard)
  async getCinemaBySlug(@Param('slug') slug: string): Promise<CinemaResponse> {
    const cinema = await this.cinemasService.getCinemaBySlug(slug);
    if (!cinema) throw new NotFoundException(`Cinema "${slug}" not found`);

    return cinema;
  }

  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createCinemasBatch(@Body() dto: CreateCinemasBatchDto): Promise<void> {
    return this.cinemasService.createCinemasBatch(dto.cinemas);
  }

  @Post(':slug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateCinemaBySlug(
    @Param('slug') slug: string,
    @Body() body: UpdateCinemaDto,
  ): Promise<Cinema> {
    const cinema = await this.cinemasService.updateCinemaBySlug(slug, body);

    if (!cinema) throw new NotFoundException(`Cinema "${slug}" not found`);
    return cinema;
  }
}
