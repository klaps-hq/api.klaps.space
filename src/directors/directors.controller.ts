import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DirectorsService } from './directors.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { DirectorResponse } from './directors.types';
import type { PaginatedResponse } from '../lib/paginate';
import { GetDirectorsQueryDto } from './dto/get-directors-query.dto';

@Controller('directors')
export class DirectorsController {
  constructor(private readonly directorsService: DirectorsService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getDirectors(
    @Query() query: GetDirectorsQueryDto,
  ): Promise<PaginatedResponse<DirectorResponse>> {
    return this.directorsService.getDirectors(query);
  }

  @Get(':slug')
  @UseGuards(InternalApiKeyGuard)
  async getDirectorBySlug(
    @Param('slug') slug: string,
  ): Promise<DirectorResponse> {
    const director = await this.directorsService.getDirectorBySlug(slug);
    if (!director) throw new NotFoundException(`Director "${slug}" not found`);

    return director;
  }
}
