import { Module } from '@nestjs/common';
import { ShowtimesController } from './showtimes.controller';
import { ShowtimesService } from './showtimes.service';
import { ShowtimesRepository } from './showtimes.repository';
import { CitiesModule } from '../cities/cities.module';

@Module({
  imports: [CitiesModule],
  controllers: [ShowtimesController],
  providers: [ShowtimesService, ShowtimesRepository],
  exports: [ShowtimesService],
})
export class ShowtimesModule {}
