import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ShowtimesController } from './showtimes.controller';
import { ShowtimesService } from './showtimes.service';

describe('ShowtimesController', () => {
  let controller: ShowtimesController;
  let service: jest.Mocked<ShowtimesService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ShowtimesController],
      providers: [
        {
          provide: ShowtimesService,
          useValue: {
            getShowtimes: jest.fn(),
            createShowtimesBatch: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(ShowtimesController);
    service = module.get(ShowtimesService);
  });

  describe('getShowtimes', () => {
    it('should delegate to service with query dto', async () => {
      const query = {
        dateFrom: '2025-01-10',
        dateTo: '2025-01-20',
        cityId: 3,
      } as any;
      const showtimes = [
        {
          id: 1,
          url: 'https://kino.pl/1',
          cityId: 3,
          date: new Date('2025-01-15'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          url: 'https://kino.pl/2',
          cityId: 3,
          date: new Date('2025-01-16'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      service.getShowtimes.mockResolvedValue(showtimes);

      const result = await controller.getShowtimes(query);

      expect(result).toEqual(showtimes);
      expect(service.getShowtimes).toHaveBeenCalledWith(query);
    });
  });

  describe('createShowtimesBatch', () => {
    it('should delegate to service with batch dto', async () => {
      const dto = {
        showtimes: [
          { url: 'https://kino.pl/1', cityId: 3, date: '2025-01-15' },
          { url: 'https://kino.pl/2', cityId: 5, date: '2025-01-16' },
        ],
        scrapedCityIds: [3, 5],
      } as any;
      service.createShowtimesBatch.mockResolvedValue(undefined);

      const result = await controller.createShowtimesBatch(dto);

      expect(result).toBeUndefined();
      expect(service.createShowtimesBatch).toHaveBeenCalledWith(dto);
    });
  });
});
