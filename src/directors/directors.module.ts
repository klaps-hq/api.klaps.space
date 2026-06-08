import { Module } from '@nestjs/common';
import { DirectorsController } from './directors.controller';
import { DirectorsService } from './directors.service';
import { DirectorsRepository } from './directors.repository';

@Module({
  controllers: [DirectorsController],
  providers: [DirectorsService, DirectorsRepository],
  exports: [DirectorsService],
})
export class DirectorsModule {}
