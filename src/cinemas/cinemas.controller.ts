import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { CinemaWithCityName } from './cinemas.types';
import { GetCinemasQueryDto } from './dto/get-cinemas-query.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  /**
   * URL: /api/v1/cinemas
   * Returns cinemas, optionally filtered by cityId, with a configurable limit.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCinemas(
    @Query() query: GetCinemasQueryDto,
  ): Promise<CinemaWithCityName[]> {
    return this.cinemasService.getCinemas({
      cityId: query.cityId,
      limit: query.limit,
    });
  }
}
