import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Showtime } from './showtimes.types';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { GetProcessedCityIdsQueryDto } from './dto/get-processed-city-ids-query.dto';
import { MarkCityProcessedDto } from './dto/mark-city-processed.dto';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  /**
   * URL: /api/v1/showtimes
   * Returns all showtimes.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getShowtimes(): Promise<Showtime[]> {
    return this.showtimesService.getShowtimes();
  }

  /**
   * URL: /api/v1/showtimes/processed-city-ids?startDate=...&endDate=...
   * Returns distinct cityIds from processed_cities within the given date range.
   * Includes cities that had zero showtimes but were already checked by the scrapper.
   */
  @Get('processed-city-ids')
  @UseGuards(InternalApiKeyGuard)
  getProcessedCityIds(
    @Query() query: GetProcessedCityIdsQueryDto,
  ): Promise<number[]> {
    return this.showtimesService.getProcessedCityIds(
      query.startDate,
      query.endDate,
    );
  }

  /**
   * URL: /api/v1/showtimes/mark-city-processed
   * Upserts a processed_cities record. If duplicate (cityId, processedAt), does nothing.
   */
  @Post('mark-city-processed')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  async markCityProcessed(
    @Body() dto: MarkCityProcessedDto,
  ): Promise<{ message: string }> {
    await this.showtimesService.markCityProcessed(dto);
    return { message: 'City marked as processed' };
  }

  /**
   * URL: /api/v1/showtimes
   * Creates or updates a showtime.
   */
  @Post()
  @UseGuards(InternalApiKeyGuard)
  createShowtime(@Body() dto: CreateShowtimeDto): Promise<Showtime> {
    return this.showtimesService.createShowtime(dto);
  }
}
