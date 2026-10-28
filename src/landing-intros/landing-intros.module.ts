import { Module } from '@nestjs/common';
import { LandingIntrosController } from './landing-intros.controller';
import { LandingIntrosService } from './landing-intros.service';
import { LandingIntrosRepository } from './landing-intros.repository';

@Module({
  controllers: [LandingIntrosController],
  providers: [LandingIntrosService, LandingIntrosRepository],
})
export class LandingIntrosModule {}
