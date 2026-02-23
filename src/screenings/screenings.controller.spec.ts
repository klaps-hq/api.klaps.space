import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScreeningsController } from './screenings.controller';
import { ScreeningsService } from './screenings.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

describe('ScreeningsController', () => {
  let controller: ScreeningsController;
  let service: jest.Mocked<ScreeningsService>;

  beforeEach(async () => {
    const mockService = {
      getScreenings: jest.fn(),
      createScreening: jest.fn(),
      getRandomRetroScreening: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ScreeningsController],
      providers: [{ provide: ScreeningsService, useValue: mockService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ScreeningsController);
    service = module.get(ScreeningsService) as jest.Mocked<ScreeningsService>;
  });

  describe('getScreenings', () => {
    it('delegates all query params to service', async () => {
      const expected = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      service.getScreenings.mockResolvedValue(expected);

      const query = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        movieId: 1,
        cityId: 2,
        genreId: 3,
        search: 'test',
        page: 1,
        limit: 10,
      };
      const result = await controller.getScreenings(query);

      expect(result).toEqual(expected);
      expect(service.getScreenings).toHaveBeenCalledWith({
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        movieId: 1,
        cityId: 2,
        citySlug: undefined,
        genreId: 3,
        genreSlug: undefined,
        cinemaSlug: undefined,
        search: 'test',
        page: 1,
        limit: 10,
      });
    });
  });

  describe('createScreening', () => {
    it('delegates to service', async () => {
      const dto = { url: 'http://a', movieId: 1, cinemaId: 1 } as any;
      const screening = { id: 1, ...dto };
      service.createScreening.mockResolvedValue(screening);

      const result = await controller.createScreening(dto);

      expect(result).toEqual(screening);
    });
  });

  describe('getRandomRetroScreening', () => {
    it('returns screening when found', async () => {
      const expected = {
        movie: { id: 1, title: 'Retro' },
        screening: { id: 10 },
      } as any;
      service.getRandomRetroScreening.mockResolvedValue(expected);

      const result = await controller.getRandomRetroScreening();

      expect(result).toEqual(expected);
    });

    it('throws NotFoundException when no screening', async () => {
      service.getRandomRetroScreening.mockResolvedValue(null);

      await expect(controller.getRandomRetroScreening()).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
