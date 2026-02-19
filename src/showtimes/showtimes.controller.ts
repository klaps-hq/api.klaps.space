import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Showtime, UnprocessedShowtimeResponse } from './showtimes.types';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { GetProcessedCityIdsQueryDto } from './dto/get-processed-city-ids-query.dto';
import { GetUnprocessedQueryDto } from './dto/get-unprocessed-query.dto';
import { MarkCityProcessedDto } from './dto/mark-city-processed.dto';
import { MarkShowtimeProcessedDto } from './dto/mark-showtime-processed.dto';
import { ProcessShowtimeDto } from './dto/process-showtime.dto';
import { BatchCreateShowtimesDto } from './dto/batch-create-showtimes.dto';

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
   * URL: /api/v1/showtimes/unprocessed?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns showtimes that have not been marked as processed
   * within the given date range.
   */
  @Get('unprocessed')
  @UseGuards(InternalApiKeyGuard)
  getUnprocessedShowtimes(
    @Query() query: GetUnprocessedQueryDto,
  ): Promise<UnprocessedShowtimeResponse[]> {
    return this.showtimesService.getUnprocessedShowtimes(query.from, query.to);
  }

  /**
   * URL: /api/v1/showtimes/processed-city-ids?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns distinct cityIds from processed_cities within the given date range.
   */
  @Get('processed-city-ids')
  @UseGuards(InternalApiKeyGuard)
  getProcessedCityIds(
    @Query() query: GetProcessedCityIdsQueryDto,
  ): Promise<number[]> {
    return this.showtimesService.getProcessedCityIds(query.from, query.to);
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
   * URL: /api/v1/showtimes/mark-processed
   * Marks a showtime as processed. Idempotent — duplicate calls do nothing.
   */
  @Post('mark-processed')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async markShowtimeProcessed(
    @Body() dto: MarkShowtimeProcessedDto,
  ): Promise<{ message: string }> {
    await this.showtimesService.markShowtimeProcessed(dto);
    return { message: 'Showtime marked as processed' };
  }

  /**
   * URL: /api/v1/showtimes/batch
   * Bulk upserts showtimes in a single transaction.
   */
  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  batchCreateShowtimes(
    @Body() dto: BatchCreateShowtimesDto,
  ): Promise<{ count: number }> {
    return this.showtimesService.batchCreateShowtimes(dto.showtimes);
  }

  /**
   * URL: /api/v1/showtimes/:id/process
   * Inserts screenings for a showtime using the provided movieId,
   * then marks the showtime as processed — all in one transaction.
   * If movieId is null, only marks as processed (skipped movie).
   */
  @Post(':id/process')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  processShowtime(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessShowtimeDto,
  ): Promise<{ movieId: number | null; screeningsCount: number }> {
    return this.showtimesService.processShowtime(id, dto);
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
