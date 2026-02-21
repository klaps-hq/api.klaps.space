import { Test } from '@nestjs/testing';
import { ShowtimesController } from './showtimes.controller';
import { ShowtimesService } from './showtimes.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

describe('ShowtimesController', () => {
  let controller: ShowtimesController;
  let service: jest.Mocked<ShowtimesService>;

  beforeEach(async () => {
    const mockService = {
      getShowtimes: jest.fn(),
      getUnprocessedShowtimes: jest.fn(),
      getProcessedCityIds: jest.fn(),
      markCityProcessed: jest.fn(),
      markShowtimeProcessed: jest.fn(),
      batchCreateShowtimes: jest.fn(),
      processShowtime: jest.fn(),
      createShowtime: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ShowtimesController],
      providers: [{ provide: ShowtimesService, useValue: mockService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ShowtimesController);
    service = module.get(ShowtimesService) as jest.Mocked<ShowtimesService>;
  });

  describe('getShowtimes', () => {
    it('returns all showtimes', async () => {
      const showtimes = [{ id: 1 }] as any;
      service.getShowtimes.mockResolvedValue(showtimes);

      const result = await controller.getShowtimes();

      expect(result).toEqual(showtimes);
    });
  });

  describe('getUnprocessedShowtimes', () => {
    it('delegates date range to service', async () => {
      service.getUnprocessedShowtimes.mockResolvedValue([]);

      const result = await controller.getUnprocessedShowtimes({
        from: '2024-01-01',
        to: '2024-12-31',
      });

      expect(result).toEqual([]);
      expect(service.getUnprocessedShowtimes).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-12-31',
      );
    });
  });

  describe('getProcessedCityIds', () => {
    it('returns city ids', async () => {
      service.getProcessedCityIds.mockResolvedValue([1, 2]);

      const result = await controller.getProcessedCityIds({
        from: '2024-01-01',
        to: '2024-12-31',
      });

      expect(result).toEqual([1, 2]);
    });
  });

  describe('markCityProcessed', () => {
    it('returns success message', async () => {
      service.markCityProcessed.mockResolvedValue(undefined);

      const result = await controller.markCityProcessed({
        cityId: 1,
      } as any);

      expect(result).toEqual({ message: 'City marked as processed' });
    });
  });

  describe('markShowtimeProcessed', () => {
    it('returns success message', async () => {
      service.markShowtimeProcessed.mockResolvedValue(undefined);

      const result = await controller.markShowtimeProcessed({
        showtimeId: 1,
      });

      expect(result).toEqual({ message: 'Showtime marked as processed' });
    });
  });

  describe('batchCreateShowtimes', () => {
    it('delegates to service', async () => {
      service.batchCreateShowtimes.mockResolvedValue({ count: 5 });

      const result = await controller.batchCreateShowtimes({
        showtimes: Array(5).fill({}) as any,
      });

      expect(result).toEqual({ count: 5 });
    });
  });

  describe('processShowtime', () => {
    it('delegates id and dto to service', async () => {
      const expected = { movieId: 5, screeningsCount: 3 };
      service.processShowtime.mockResolvedValue(expected);

      const dto = { movieId: 5, screenings: [] } as any;
      const result = await controller.processShowtime(10, dto);

      expect(result).toEqual(expected);
      expect(service.processShowtime).toHaveBeenCalledWith(10, dto);
    });
  });

  describe('createShowtime', () => {
    it('delegates to service', async () => {
      const dto = { url: 'http://a', cityId: 1, date: '2024-08-15' } as any;
      const showtime = { id: 1, ...dto };
      service.createShowtime.mockResolvedValue(showtime);

      const result = await controller.createShowtime(dto);

      expect(result).toEqual(showtime);
    });
  });
});
