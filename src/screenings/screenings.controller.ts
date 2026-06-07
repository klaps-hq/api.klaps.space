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
import { GetLastUpdatedQueryDto } from './dto/get-last-updated-query.dto';
import { CreateScreeningDto } from './dto/create-screening.dto';
import type {
  Screening,
  ScreeningResponse,
  ScreeningGroupResponse,
  RandomScreeningResponse,
  LastUpdatedResponse,
} from './screenings.types';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getScreenings(
    @Query() query: GetScreeningsQueryDto,
  ): Promise<(ScreeningResponse | ScreeningGroupResponse)[]> {
    return this.screeningsService.getScreenings(query);
  }

  @Get('last-updated')
  @UseGuards(InternalApiKeyGuard)
  getLastUpdatedAt(
    @Query() query: GetLastUpdatedQueryDto,
  ): Promise<LastUpdatedResponse> {
    return this.screeningsService.getLastUpdatedAt(query);
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

  @Post()
  @UseGuards(InternalApiKeyGuard)
  createScreening(@Body() dto: CreateScreeningDto): Promise<Screening> {
    return this.screeningsService.createScreening(dto);
  }
}
