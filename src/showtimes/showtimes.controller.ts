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
import type { ShowtimeResponse } from './showtimes.types';
import { GetShowtimesQueryDto } from './dto/get-showtimes-query.dto';
import { CreateShowtimesBatchDto } from './dto/create-showtimes-batch.dto';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getShowtimes(
    @Query() query: GetShowtimesQueryDto,
  ): Promise<ShowtimeResponse[]> {
    return this.showtimesService.getShowtimes(query);
  }

  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createShowtimesBatch(@Body() dto: CreateShowtimesBatchDto): Promise<void> {
    return this.showtimesService.createShowtimesBatch(dto);
  }
}
