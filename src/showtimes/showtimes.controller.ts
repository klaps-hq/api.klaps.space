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
import { GetShowtimesQueryDto } from './dto/get-showtimes-query.dto';
import { PostShowtimesDto } from './dto/post-showtimes.dto';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  /**
   * @url /api/v1/showtimes
   * @description Get showtimes by date range and city.
   * @param dto.dateFrom - Start date.
   * @param dto.dateTo - End date.
   * @param dto.cityId - City ID.
   * @param dto.citySlug - City slug.
   * @returns Showtimes.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getShowtimes(@Query() dto: GetShowtimesQueryDto): Promise<Showtime[]> {
    return this.showtimesService.getShowtimes(dto);
  }

  /**
   * @url /api/v1/showtimes/batch
   * @description Create showtimes batch.
   * @param dto - Create showtimes dto.
   * @param dto.showtimes - Showtimes.
   * @param dto.showtimes.url - Showtime URL.
   * @param dto.showtimes.cityId - City ID.
   * @param dto.showtimes.date - Showtime date.
   * @returns Void.
   */
  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createShowtimesBatch(@Body() dto: PostShowtimesDto): Promise<void> {
    return this.showtimesService.createShowtimesBatch(dto);
  }
}
