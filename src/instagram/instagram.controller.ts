import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { GetInstagramCandidateQueryDto } from './dto/get-instagram-candidate-query.dto';
import type { InstagramCandidateResponse } from '../lib/response-types';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('candidate')
  @UseGuards(InternalApiKeyGuard)
  getCandidate(
    @Query() query: GetInstagramCandidateQueryDto,
  ): Promise<InstagramCandidateResponse> {
    return this.instagramService.getCandidate(query.date);
  }
}
