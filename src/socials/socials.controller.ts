import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { SocialsGetCandidateResponse } from '../lib/response-types';
import { GetSocialCandidateQueryDto } from './dto/get-socials-candidate-query.dto';
import { SocialsService } from './socials.service';

@Controller('socials')
export class SocialsController {
  constructor(private readonly socialsService: SocialsService) {}

  /**
   * URL: /api/v1/socials/candidate
   * Method: GET
   * Body: GetSocialCandidateQueryDto
   * Response: SocialsGetCandidateResponse
   * @param query.dateFrom - The start date of the date range
   * @param query.dateTo - The end date of the date range
   * @param query.minScore - The minimum score of the candidates
   * @param query.platform - The platform of the candidates
   * @param query.numberOfCandidates - The number of candidates to return
   * @returns SocialsGetCandidateResponse
   */
  @Get('candidate')
  @UseGuards(InternalApiKeyGuard)
  getCandidate(
    @Query() query: GetSocialCandidateQueryDto,
  ): Promise<SocialsGetCandidateResponse> {
    return this.socialsService.getCandidate(
      query.dateFrom,
      query.dateTo,
      query.minScore,
      query.platform,
      query.numberOfCandidates,
    );
  }
}
