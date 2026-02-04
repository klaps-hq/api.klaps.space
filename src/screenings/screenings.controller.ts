import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { MovieWithScreenings } from './screenings.types';
import { GetScreeningsQueryDto } from './dto/get-screenings-query.dto';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  /**
   * Returns movies with screenings for the given date (default today) and optional city.
   * Query params: date (YYYY-MM-DD), cityId (optional), movieLimit (optional, default 50).
   */
  @Get('screenings')
  @UseGuards(InternalApiKeyGuard)
  getScreenings(
    @Query() query: GetScreeningsQueryDto,
  ): Promise<MovieWithScreenings[]> {
    return this.screeningsService.getScreenings({
      date: query.date,
      cityId: query.cityId,
    });
  }

  @Get('random-screening')
  @UseGuards(InternalApiKeyGuard)
  getRandomRetroScreening(): Promise<MovieWithScreenings | null> {
    return this.screeningsService.getRandomRetroScreening();
  }
}
