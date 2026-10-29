import { Module } from '@nestjs/common';
import { SocialsController } from './socials.controller';
import { SocialsService } from './socials.service';
import { SocialsRepository } from './socials.repository';
import { SocialsSeriesService } from './socials-series.service';
import { SocialsSeriesRepository } from './socials-series.repository';
import { SocialsPlansController } from './socials-plans.controller';
import { SocialsPlansService } from './socials-plans.service';
import { SocialsPlansRepository } from './socials-plans.repository';

@Module({
  controllers: [SocialsController, SocialsPlansController],
  providers: [
    SocialsService,
    SocialsRepository,
    SocialsSeriesService,
    SocialsSeriesRepository,
    SocialsPlansService,
    SocialsPlansRepository,
  ],
  exports: [SocialsService],
})
export class SocialsModule {}
