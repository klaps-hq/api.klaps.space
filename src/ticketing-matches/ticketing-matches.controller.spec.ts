import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TicketingMatchesController } from './ticketing-matches.controller';
import { TicketingMatchesService } from './ticketing-matches.service';

describe('TicketingMatchesController', () => {
  let controller: TicketingMatchesController;
  let service: jest.Mocked<TicketingMatchesService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [TicketingMatchesController],
      providers: [
        {
          provide: TicketingMatchesService,
          useValue: {
            getMatches: jest.fn().mockResolvedValue([]),
            saveMatches: jest.fn().mockResolvedValue({ saved: 0 }),
            reviewMatch: jest.fn().mockResolvedValue({ key: 'k' }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(TicketingMatchesController);
    service = module.get(TicketingMatchesService);
  });

  it('lists matches with the review filter', async () => {
    await controller.getMatches({ review: 'unresolved' });
    expect(service.getMatches).toHaveBeenCalledWith({ review: 'unresolved' });
  });

  it('saves the scraper matches', async () => {
    await expect(controller.saveMatches({ matches: [] })).resolves.toEqual({
      saved: 0,
    });
  });

  it('applies a panel review', async () => {
    await controller.reviewMatch({ key: 'k', notFilm: true });
    expect(service.reviewMatch).toHaveBeenCalledWith({
      key: 'k',
      notFilm: true,
    });
  });
});
