import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CitiesModule } from './cities/cities.module';
import { DatabaseModule } from './database/database.module';
import { MoviesModule } from './movies/movies.module';
import { GenresModule } from './genres/genres.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { CinemasModule } from './cinemas/cinemas.module';
import { SocialsModule } from './socials/socials.module';
import { ShowtimesModule } from './showtimes/showtimes.module';
import { SearchModule } from './search/search.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { InternalBypassThrottlerGuard } from './guards/internal-bypass-throttler.guard';
import { AppLoggerModule } from './logger/logger.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppLoggerModule,
    DatabaseModule,
    HealthModule,
    MoviesModule,
    CitiesModule,
    CinemasModule,
    GenresModule,
    SocialsModule,
    ScreeningsModule,
    ShowtimesModule,
    SearchModule,
    SitemapModule,
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 10_000, limit: 30 },
      { name: 'long', ttl: 60_000, limit: 100 },
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: InternalBypassThrottlerGuard }],
})
export class AppModule {}
