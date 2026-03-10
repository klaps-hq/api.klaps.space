import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { Cinema } from '../database/schemas/cinemas.schema';
import type { CinemaGroupResponse, CinemaResponse } from '../lib/response-types';
import { GetCinemasDto } from './dto/get-cinemas.dto';
import { PostCinemasBatchDto, PostCinemaDto } from './dto/post-cinemas.dto';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getCinemas(
    @Query() query: GetCinemasDto,
  ): Promise<{ data: CinemaGroupResponse[] } | { data: Cinema[] }> {
    return this.cinemasService.getCinemas(query);
  }

  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  getCinemaByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<CinemaResponse> {
    return this.cinemasService.getCinemaByIdOrSlug(idOrSlug);
  }

  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createCinemasBatch(@Body() dto: PostCinemasBatchDto): Promise<void> {
    return this.cinemasService.createCinemasBatch(dto.cinemas);
  }

  @Post(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  updateCinemaByIdOrSlug(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: PostCinemaDto,
  ): Promise<Cinema> {
    return this.cinemasService.updateCinemaByIdOrSlug(idOrSlug, body);
  }
}
