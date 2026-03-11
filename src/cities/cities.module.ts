import { Module } from '@nestjs/common';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';
import { CitiesRepository } from './cities.repository';
import { ScreeningsModule } from '../screenings/screenings.module';

@Module({
  imports: [ScreeningsModule],
  controllers: [CitiesController],
  providers: [CitiesService, CitiesRepository],
  exports: [CitiesService],
})
export class CitiesModule {}
