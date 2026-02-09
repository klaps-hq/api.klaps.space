import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { GetScreeningsQueryDto } from './dto/get-screenings-query.dto';
import { CreateScreeningDto } from './dto/create-screening.dto';
import type { MovieWithScreenings, Screening } from './screenings.types';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  /**
   * Returns movies with screenings for the given date (default today) and optional filters.
   * Query params: date (YYYY-MM-DD), cityId (optional), genreId (optional), limit (optional, default 10).
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getScreenings(
    @Query() query: GetScreeningsQueryDto,
  ): Promise<MovieWithScreenings[]> {
    return this.screeningsService.getScreenings({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      movieId: query.movieId,
      cityId: query.cityId,
      genreId: query.genreId,
      limit: query.limit,
    });
  }

  /**
   * URL: /api/v1/screenings
   * Creates a new screening.
   */
  @Post()
  @UseGuards(InternalApiKeyGuard)
  createScreening(@Body() dto: CreateScreeningDto): Promise<Screening> {
    return this.screeningsService.createScreening(dto);
  }

  @Get('random-screening')
  @UseGuards(InternalApiKeyGuard)
  async getRandomRetroScreening(): Promise<MovieWithScreenings> {
    const screening = await this.screeningsService.getRandomRetroScreening();
    if (!screening) {
      throw new NotFoundException('No retro screening found');
    }
    return screening;
  }
}
