import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { LandingIntrosService } from './landing-intros.service';
import type { LandingIntroResponse } from './landing-intros.types';
import { UpsertLandingIntroDto } from './dto/upsert-landing-intro.dto';
import {
  LANDING_INTRO_KEY_MAX_LENGTH,
  LANDING_INTRO_KEY_PATTERN,
} from './landing-intros.constants';

const assertValidKey = (key: string): void => {
  if (
    key.length > LANDING_INTRO_KEY_MAX_LENGTH ||
    !LANDING_INTRO_KEY_PATTERN.test(key)
  ) {
    throw new BadRequestException(`Invalid landing intro key "${key}"`);
  }
};

@Controller('landing-intros')
export class LandingIntrosController {
  constructor(private readonly landingIntrosService: LandingIntrosService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getLandingIntros(): Promise<LandingIntroResponse[]> {
    return this.landingIntrosService.getLandingIntros();
  }

  @Get(':key')
  @UseGuards(InternalApiKeyGuard)
  async getLandingIntro(
    @Param('key') key: string,
  ): Promise<LandingIntroResponse> {
    assertValidKey(key);
    const intro = await this.landingIntrosService.getLandingIntro(key);
    if (!intro) throw new NotFoundException(`Landing intro "${key}" not found`);

    return intro;
  }

  @Post(':key')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  upsertLandingIntro(
    @Param('key') key: string,
    @Body() body: UpsertLandingIntroDto,
  ): Promise<LandingIntroResponse> {
    assertValidKey(key);
    return this.landingIntrosService.upsertLandingIntro(key, body.content);
  }
}
