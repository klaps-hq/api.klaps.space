import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';

describe('ScreeningsController', () => {
  let controller: ScreeningsController;
  let service: jest.Mocked<ScreeningsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ScreeningsController],
      providers: [
        {
          provide: ScreeningsService,
          useValue: {
            getScreenings: jest.fn(),
            getRandomRetroScreening: jest.fn(),
            createScreening: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(ScreeningsController);
    service = module.get(ScreeningsService);
  });

  describe('getScreenings', () => {
    it('should delegate to service with query params', async () => {
      const query = { citySlug: 'krakow', dateFrom: '2025-01-01' } as any;
      const expected = [
        {
          movie: { id: 10, title: 'Inception' },
          screenings: [{ id: 1 }],
          summary: {
            screeningsCount: 1,
            cinemasCount: 1,
            citiesCount: 1,
            cities: ['Krakow'],
          },
        },
      ];
      service.getScreenings.mockResolvedValue(expected);

      const result = await controller.getScreenings(query);

      expect(result).toEqual(expected);
      expect(service.getScreenings).toHaveBeenCalledWith(query);
    });
  });

  describe('getRandomRetroScreening', () => {
    it('should return screening when found', async () => {
      const screening = {
        movie: { id: 42, title: 'Vertigo' },
        screening: { id: 7, date: '2025-01-15', time: '20:00' },
      };
      service.getRandomRetroScreening.mockResolvedValue(screening as any);

      const result = await controller.getRandomRetroScreening();

      expect(result).toEqual(screening);
    });

    it('should throw NotFoundException when no retro screening found', async () => {
      service.getRandomRetroScreening.mockResolvedValue(null);

      await expect(controller.getRandomRetroScreening()).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createScreening', () => {
    it('should delegate to service', async () => {
      const dto = {
        movieId: 42,
        cinemaId: 5,
        showtimeId: 99,
        date: '2025-01-20',
        url: 'https://kino.pl/tickets/99',
        isDubbing: false,
        isSubtitled: true,
      };
      const created = {
        id: 1,
        movieId: 42,
        cinemaId: 5,
        showtimeId: 99,
        date: new Date('2025-01-20'),
        url: 'https://kino.pl/tickets/99',
        isDubbing: false,
        isSubtitled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.createScreening.mockResolvedValue(created);

      const result = await controller.createScreening(dto as any);

      expect(result).toEqual(created);
      expect(service.createScreening).toHaveBeenCalledWith(dto);
    });
  });
});
