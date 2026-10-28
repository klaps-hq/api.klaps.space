import { Module } from '@nestjs/common';
import { SocialsController } from './socials.controller';
import { SocialsService } from './socials.service';
import { SocialsRepository } from './socials.repository';
import { SocialsSeriesService } from './socials-series.service';
import { SocialsSeriesRepository } from './socials-series.repository';

@Module({
  controllers: [SocialsController],
  providers: [
    SocialsService,
    SocialsRepository,
    SocialsSeriesService,
    SocialsSeriesRepository,
  ],
  exports: [SocialsService],
})
export class SocialsModule {}
