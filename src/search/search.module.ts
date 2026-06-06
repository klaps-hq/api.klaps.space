import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CitiesModule } from '../cities/cities.module';
import { CinemasModule } from '../cinemas/cinemas.module';

@Module({
  imports: [CitiesModule, CinemasModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
