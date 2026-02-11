import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

/**
 * Module for movie-related API and business logic.
 */
@Module({
  imports: [CacheModule.register()],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
