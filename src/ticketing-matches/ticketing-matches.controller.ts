import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { TicketingMatchesService } from './ticketing-matches.service';
import {
  GetTicketingMatchesQueryDto,
  ReviewTicketingMatchDto,
  SaveTicketingMatchesDto,
} from './dto/ticketing-matches.dto';
import type { TicketingMatchResponse } from './ticketing-matches.types';

// Keys contain provider URLs (MSI hosts), so they travel in the body.
@Controller('ticketing-matches')
export class TicketingMatchesController {
  constructor(private readonly service: TicketingMatchesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getMatches(
    @Query() query: GetTicketingMatchesQueryDto,
  ): Promise<TicketingMatchResponse[]> {
    return this.service.getMatches(query);
  }

  @Put()
  @UseGuards(InternalApiKeyGuard)
  saveMatches(
    @Body() body: SaveTicketingMatchesDto,
  ): Promise<{ saved: number }> {
    return this.service.saveMatches(body);
  }

  @Patch()
  @UseGuards(InternalApiKeyGuard)
  reviewMatch(
    @Body() body: ReviewTicketingMatchDto,
  ): Promise<TicketingMatchResponse> {
    return this.service.reviewMatch(body);
  }
}
