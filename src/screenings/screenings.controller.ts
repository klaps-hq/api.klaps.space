import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { GetScreeningsQueryDto } from './dto/get-screenings-query.dto';
import { GetLastUpdatedQueryDto } from './dto/get-last-updated-query.dto';
import { GetRecentScreeningsQueryDto } from './dto/get-recent-screenings-query.dto';
import { GetRecentVenuesQueryDto } from './dto/get-recent-venues-query.dto';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { GetProgrammeProfileQueryDto } from './dto/get-programme-profile-query.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';
import type {
  Screening,
  ScreeningResponse,
  ScreeningGroupResponse,
  RandomScreeningResponse,
  LastUpdatedResponse,
  RecentScreeningResponse,
  RecentVenueResponse,
  ProgrammeProfileResponse,
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

  @Get('recent')
  @UseGuards(InternalApiKeyGuard)
  getRecentScreenings(
    @Query() query: GetRecentScreeningsQueryDto,
  ): Promise<RecentScreeningResponse[]> {
    return this.screeningsService.getRecentScreenings(query);
  }

  @Get('recent-venues')
  @UseGuards(InternalApiKeyGuard)
  getRecentVenues(
    @Query() query: GetRecentVenuesQueryDto,
  ): Promise<RecentVenueResponse[]> {
    return this.screeningsService.getRecentVenues(query);
  }

  @Get('profile')
  @UseGuards(InternalApiKeyGuard)
  getProgrammeProfile(
    @Query() query: GetProgrammeProfileQueryDto,
  ): Promise<ProgrammeProfileResponse> {
    return this.screeningsService.getProgrammeProfile(query);
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

  @Patch(':id')
  @UseGuards(InternalApiKeyGuard)
  updateScreening(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScreeningDto,
  ): Promise<Screening> {
    return this.screeningsService.updateScreening(id, dto);
  }

  @Delete(':id')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScreening(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.screeningsService.deleteScreening(id);
  }
}
