import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { MovieWithScreenings } from './screenings.types';
import { GetScreeningsQueryDto } from './dto/get-screenings-query.dto';

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
      cityId: query.cityId,
      genreId: query.genreId,
      limit: query.limit,
    });
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
