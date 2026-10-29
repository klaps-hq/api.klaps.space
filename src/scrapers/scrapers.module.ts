import { Module } from '@nestjs/common';
import { ScrapersController } from './scrapers.controller';
import { ScrapersService } from './scrapers.service';
import { ScrapersRepository } from './scrapers.repository';

@Module({
  controllers: [ScrapersController],
  providers: [ScrapersService, ScrapersRepository],
})
export class ScrapersModule {}
