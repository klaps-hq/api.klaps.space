import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { SeriesService } from './series.service';
import { UpdateSeriesDto } from './dto/update-series.dto';
import type { SeriesDetailResponse, SeriesResponse } from './series.types';

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getSeries(): Promise<SeriesResponse[]> {
    return this.seriesService.getSeries();
  }

  @Get(':slug')
  @UseGuards(InternalApiKeyGuard)
  getSeriesBySlug(@Param('slug') slug: string): Promise<SeriesDetailResponse> {
    return this.seriesService.getSeriesBySlug(slug);
  }

  @Patch(':slug')
  @UseGuards(InternalApiKeyGuard)
  updateSeries(
    @Param('slug') slug: string,
    @Body() body: UpdateSeriesDto,
  ): Promise<SeriesResponse> {
    return this.seriesService.updateSeries(slug, body);
  }
}
