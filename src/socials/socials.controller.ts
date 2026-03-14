import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { SocialsGetCandidateResponse } from '../lib/response-types';
import { GetSocialCandidateQueryDto } from './dto/get-socials-candidate-query.dto';
import { SocialsService } from './socials.service';
import { SocialsReserveRequestDto } from './dto/post-socials-candidate.dto';

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

  /**
   * URL: /api/v1/socials/reserve
   * Description: Reserves a candidate for publishing
   * Method: POST
   * Body: SocialsReserveRequestDto
   * Response: void
   * @param body\
   * @param platform - The platform to reserve
   * @param screeningId - The id of the screening to reserve
   * @returns void
   */
  @Post('reserve')
  @UseGuards(InternalApiKeyGuard)
  reserve(@Body() body: SocialsReserveRequestDto): Promise<void> {
    return this.socialsService.reserveCandidate(
      body.platform,
      body.screeningId,
    );
  }

  /**
   * URL: /api/v1/socials/publish
   * Description: Marks a candidate as published
   * Method: POST
   * Body: SocialsReserveRequestDto
   * Response: SocialsPublishResponse
   * @param body
   * @param body.platform - The platform to publish
   * @param body.screeningId - The id of the screening to publish
   * @returns void
   */
  @Post('publish')
  @UseGuards(InternalApiKeyGuard)
  publish(@Body() body: SocialsReserveRequestDto): Promise<void> {
    return this.socialsService.publishCandidate(
      body.platform,
      body.screeningId,
    );
  }
}
