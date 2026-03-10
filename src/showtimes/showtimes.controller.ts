import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Showtime } from './showtimes.types';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { ProcessShowtimeDto } from './dto/process-showtime.dto';
import { BatchCreateShowtimesDto } from './dto/batch-create-showtimes.dto';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getShowtimes(): Promise<Showtime[]> {
    return this.showtimesService.getShowtimes();
  }

  @Get('today-cities')
  @UseGuards(InternalApiKeyGuard)
  getTodayCities(): Promise<number[]> {
    return this.showtimesService.getTodayCities();
  }

  @Get('pending')
  @UseGuards(InternalApiKeyGuard)
  getPending(): Promise<Showtime[]> {
    return this.showtimesService.getPending();
  }

  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  batchCreateShowtimes(
    @Body() dto: BatchCreateShowtimesDto,
  ): Promise<{ count: number }> {
    return this.showtimesService.batchCreateShowtimes(dto.showtimes, dto.scrapedCityIds);
  }

  @Post(':id/process')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  processShowtime(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessShowtimeDto,
  ): Promise<{ movieId: number | null; screeningsCount: number }> {
    return this.showtimesService.processShowtime(id, dto);
  }

  @Post()
  @UseGuards(InternalApiKeyGuard)
  createShowtime(@Body() dto: CreateShowtimeDto): Promise<Showtime> {
    return this.showtimesService.createShowtime(dto);
  }
}
