import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import type { ScreeningWithMovieAndCinema } from './screenings.types';
import { GetScreeningsQueryDto } from './dto/get-screenings-query.dto';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  /**
   * Returns screenings for the given date (default today) and optional city.
   * Query params: date (YYYY-MM-DD, optional), cityId (positive integer, optional).
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getScreenings(
    @Query() query: GetScreeningsQueryDto,
  ): Promise<ScreeningWithMovieAndCinema[]> {
    return this.screeningsService.getScreenings({
      date: query.date,
      cityId: query.cityId,
    });
  }
}
