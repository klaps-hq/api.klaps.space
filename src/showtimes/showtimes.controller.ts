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
   * @description Get showtimes by date range and city.
   * @param query.dateFrom - Start date.
   * @param query.dateTo - End date.
   * @param query.cityId - City ID.
   * @param query.citySlug - City slug.
   * @returns Showtimes.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getShowtimes(@Query() query: GetShowtimesQueryDto): Promise<Showtime[]> {
    return this.showtimesService.getShowtimes(query);
  }

  /**
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
