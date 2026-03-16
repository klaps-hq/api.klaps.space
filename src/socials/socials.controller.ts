import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { SocialsGetCandidateResponse } from './socials.types';
import { GetSocialCandidateQueryDto } from './dto/get-socials-candidate-query.dto';
import { SocialsService } from './socials.service';
import { SocialsActionDto } from './dto/socials-action.dto';

@Controller('socials')
export class SocialsController {
  constructor(private readonly socialsService: SocialsService) {}

  @Get('candidate')
  @UseGuards(InternalApiKeyGuard)
  getCandidate(
    @Query() query: GetSocialCandidateQueryDto,
  ): Promise<SocialsGetCandidateResponse> {
    return this.socialsService.getCandidate(query);
  }

  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalApiKeyGuard)
  reserve(@Body() body: SocialsActionDto): Promise<void> {
    return this.socialsService.reserveCandidate(body);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalApiKeyGuard)
  publish(@Body() body: SocialsActionDto): Promise<void> {
    return this.socialsService.publishCandidate(body);
  }
}
