import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CitiesModule } from './cities/cities.module';
import { DatabaseModule } from './database/database.module';
import { MoviesModule } from './movies/movies.module';
import { GenresModule } from './genres/genres.module';
import { ScreeningsModule } from './screenings/screenings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    MoviesModule,
    CitiesModule,
    GenresModule,
    ScreeningsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
