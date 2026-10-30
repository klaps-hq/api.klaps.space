import { Module } from '@nestjs/common';
import { CinemasController } from './cinemas.controller';
import { CinemasService } from './cinemas.service';
import { CinemasRepository } from './cinemas.repository';
import { CinemaLinkCheckService } from './cinema-link-check.service';
import { CitiesModule } from '../cities/cities.module';

@Module({
  imports: [CitiesModule],
  controllers: [CinemasController],
  providers: [CinemasService, CinemasRepository, CinemaLinkCheckService],
  exports: [CinemasService],
})
export class CinemasModule {}
