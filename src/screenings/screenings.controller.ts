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
import type { Screening } from './screenings.types';
import type {
  ScreeningResponse,
  ScreeningGroupResponse,
  RandomScreeningResponse,
} from '../lib/response-types';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getScreenings(
    @Query() query: GetScreeningsQueryDto,
  ): Promise<(ScreeningResponse | ScreeningGroupResponse)[]> {
    return this.screeningsService.getScreenings({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      movieId: query.movieId,
      cityId: query.cityId,
      citySlug: query.citySlug,
      genreId: query.genreId,
      genreSlug: query.genreSlug,
      cinemaSlug: query.cinemaSlug,
      search: query.search,
    });
  }

  @Post()
  @UseGuards(InternalApiKeyGuard)
  createScreening(@Body() dto: CreateScreeningDto): Promise<Screening> {
    return this.screeningsService.createScreening(dto);
  }

  @Get('random-screening')
  @UseGuards(InternalApiKeyGuard)
  async getRandomRetroScreening(): Promise<RandomScreeningResponse> {
    const screening = await this.screeningsService.getRandomRetroScreening();
    if (!screening) {
      throw new NotFoundException('No retro screening found');
    }
    return screening;
  }
}
