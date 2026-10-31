import { Module } from '@nestjs/common';
import { ScreeningsModule } from '../screenings/screenings.module';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { SeriesRepository } from './series.repository';

@Module({
  imports: [ScreeningsModule],
  controllers: [SeriesController],
  providers: [SeriesService, SeriesRepository],
  exports: [SeriesService],
})
export class SeriesModule {}
