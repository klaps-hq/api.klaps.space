import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { MoviesRepository } from './movies.repository';
import { MoviesBatchService } from './movies-batch.service';
import { GenresModule } from '../genres/genres.module';

@Module({
  imports: [CacheModule.register(), GenresModule],
  controllers: [MoviesController],
  providers: [MoviesService, MoviesRepository, MoviesBatchService],
  exports: [MoviesService],
})
export class MoviesModule {}
