import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CitiesModule } from './cities/cities.module';
import { DatabaseModule } from './database/database.module';
import { MoviesModule } from './movies/movies.module';
import { GenresModule } from './genres/genres.module';
import { DirectorsModule } from './directors/directors.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { CinemasModule } from './cinemas/cinemas.module';
import { SocialsModule } from './socials/socials.module';
import { ScrapersModule } from './scrapers/scrapers.module';
import { ShowtimesModule } from './showtimes/showtimes.module';
import { SearchModule } from './search/search.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { LandingIntrosModule } from './landing-intros/landing-intros.module';
import { AdminModule } from './admin/admin.module';
import { InternalBypassThrottlerGuard } from './guards/internal-bypass-throttler.guard';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { AppLoggerModule } from './logger/logger.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AppLoggerModule,
    DatabaseModule,
    HealthModule,
    MoviesModule,
    CitiesModule,
    CinemasModule,
    GenresModule,
    DirectorsModule,
    SocialsModule,
    ScrapersModule,
    ScreeningsModule,
    ShowtimesModule,
    SearchModule,
    LandingIntrosModule,
    SitemapModule,
    AdminModule,
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 10_000, limit: 30 },
      { name: 'long', ttl: 60_000, limit: 100 },
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: InternalBypassThrottlerGuard },
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
  ],
})
export class AppModule {}
