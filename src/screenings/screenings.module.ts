import { Module } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { ScreeningsRepository } from './screenings.repository';

@Module({
  controllers: [ScreeningsController],
  providers: [ScreeningsService, ScreeningsRepository],
  exports: [ScreeningsService],
})
export class ScreeningsModule {}
