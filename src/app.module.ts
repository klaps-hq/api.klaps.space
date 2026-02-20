import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CitiesModule } from './cities/cities.module';
import { DatabaseModule } from './database/database.module';
import { MoviesModule } from './movies/movies.module';
import { GenresModule } from './genres/genres.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { CinemasModule } from './cinemas/cinemas.module';
import { ShowtimesModule } from './showtimes/showtimes.module';
import { CustomThrottlerGuard } from './guards/custom-throttler.guard';
import { AppLoggerModule } from './logger/logger.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppLoggerModule,
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 10_000, limit: 30 },
      { name: 'long', ttl: 60_000, limit: 100 },
    ]),
    DatabaseModule,
    HealthModule,
    MoviesModule,
    CitiesModule,
    CinemasModule,
    GenresModule,
    ScreeningsModule,
    ShowtimesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
  ],
})
export class AppModule {}
