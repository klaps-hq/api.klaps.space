import { Module } from '@nestjs/common';
import { TicketingMatchesController } from './ticketing-matches.controller';
import { TicketingMatchesService } from './ticketing-matches.service';
import { TicketingMatchesRepository } from './ticketing-matches.repository';

@Module({
  controllers: [TicketingMatchesController],
  providers: [TicketingMatchesService, TicketingMatchesRepository],
})
export class TicketingMatchesModule {}
