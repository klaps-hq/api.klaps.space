import { Module } from '@nestjs/common';
import { SocialsController } from './socials.controller';
import { SocialsService } from './socials.service';
import { SocialsRepository } from './socials.repository';

@Module({
  controllers: [SocialsController],
  providers: [SocialsService, SocialsRepository],
  exports: [SocialsService],
})
export class SocialsModule {}
