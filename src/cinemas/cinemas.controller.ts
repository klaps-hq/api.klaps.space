import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { CinemaResponse, CinemaSummaryResponse } from './cinemas.types';
import { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';
import { CreateCinemasBatchDto } from './dto/create-cinemas-batch.dto';
import { UpdateCinemaDto } from './dto/update-cinema.dto';
import { SetCinemaPhotosDto } from './dto/set-cinema-photos.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCinemas(
    @Query() query: GetCinemasQueryDto,
  ): Promise<CinemaSummaryResponse[]> {
    return this.cinemasService.getCinemas(query);
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
  ): Promise<CinemaResponse> {
    const cinema = await this.cinemasService.updateCinemaBySlug(slug, body);

    if (!cinema) throw new NotFoundException(`Cinema "${slug}" not found`);
    return cinema;
  }

  // REST-owy update dla panelu admina (pelny zestaw edytowalnych pol).
  // Wspolistnieje z legacy POST :slug uzywanym przez scraper.
  @Patch(':slug')
  @UseGuards(InternalApiKeyGuard)
  async patchCinemaBySlug(
    @Param('slug') slug: string,
    @Body() body: UpdateCinemaDto,
  ): Promise<CinemaResponse> {
    const cinema = await this.cinemasService.updateCinemaBySlug(slug, body);

    if (!cinema) throw new NotFoundException(`Cinema "${slug}" not found`);
    return cinema;
  }

  // Gallery is written only by the scraper's photo pipeline (and takedowns),
  // so it has its own endpoint instead of a field in UpdateCinemaDto.
  @Put(':slug/photos')
  @UseGuards(InternalApiKeyGuard)
  async setCinemaPhotosBySlug(
    @Param('slug') slug: string,
    @Body() body: SetCinemaPhotosDto,
  ): Promise<CinemaResponse> {
    const cinema = await this.cinemasService.setCinemaPhotosBySlug(slug, body);

    if (!cinema) throw new NotFoundException(`Cinema "${slug}" not found`);
    return cinema;
  }
}
