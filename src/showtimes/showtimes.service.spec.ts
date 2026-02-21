import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { DRIZZLE } from '../database/constants';

describe('ShowtimesService', () => {
  let service: ShowtimesService;
  let mockDb: any;

  beforeEach(async () => {
    const mockInsertChain = {
      values: jest.fn().mockReturnThis(),
      onDuplicateKeyUpdate: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      query: {
        showtimes: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn().mockReturnValue(mockInsertChain),
      selectDistinct: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [ShowtimesService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get(ShowtimesService);
  });

  describe('getShowtimes', () => {
    it('returns all showtimes', async () => {
      const showtimes = [
        { id: 1, url: 'http://a', cityId: 1, date: new Date() },
      ];
      mockDb.query.showtimes.findMany.mockResolvedValue(showtimes);

      const result = await service.getShowtimes();

      expect(result).toEqual(showtimes);
    });
  });

  describe('createShowtime', () => {
    it('upserts and returns the showtime', async () => {
      const dto = { url: 'http://a', cityId: 1, date: '2024-08-15' };
      const row = { id: 1, ...dto, date: new Date(dto.date) };
      mockDb.query.showtimes.findFirst.mockResolvedValue(row);

      const result = await service.createShowtime(dto as any);

      expect(result.id).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getProcessedCityIds', () => {
    it('returns array of cityIds', async () => {
      mockDb.selectDistinct.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ cityId: 1 }, { cityId: 2 }]),
        }),
      });

      const result = await service.getProcessedCityIds(
        '2024-01-01',
        '2024-12-31',
      );

      expect(result).toEqual([1, 2]);
    });
  });

  describe('markCityProcessed', () => {
    it('inserts processed city record', async () => {
      await service.markCityProcessed({ cityId: 1, processedAt: '2024-08-15' });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('defaults processedAt to today when not provided', async () => {
      await service.markCityProcessed({ cityId: 1 } as any);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('markShowtimeProcessed', () => {
    it('inserts processed showtime record', async () => {
      await service.markShowtimeProcessed({ showtimeId: 42 });

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getUnprocessedShowtimes', () => {
    it('returns mapped showtime rows', async () => {
      const now = new Date('2024-08-15T12:00:00Z');
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                id: 1,
                url: 'http://a',
                cityId: 5,
                date: now,
                createdAt: now,
                updatedAt: now,
              },
            ]),
          }),
        }),
      });

      const result = await service.getUnprocessedShowtimes(
        '2024-01-01',
        '2024-12-31',
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].url).toBe('http://a');
      expect(result[0].date).toBe(now.toISOString());
    });

    it('returns empty array when none found', async () => {
      const result = await service.getUnprocessedShowtimes(
        '2024-01-01',
        '2024-12-31',
      );

      expect(result).toEqual([]);
    });

    it('handles string dates in rows', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                id: 2,
                url: 'http://b',
                cityId: 3,
                date: '2024-08-15T12:00:00Z',
                createdAt: '2024-08-15T12:00:00Z',
                updatedAt: '2024-08-15T12:00:00Z',
              },
            ]),
          }),
        }),
      });

      const result = await service.getUnprocessedShowtimes(
        '2024-01-01',
        '2024-12-31',
      );

      expect(result[0].date).toBe('2024-08-15T12:00:00Z');
    });
  });

  describe('batchCreateShowtimes', () => {
    it('returns count 0 for empty array', async () => {
      const result = await service.batchCreateShowtimes([]);

      expect(result).toEqual({ count: 0 });
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('returns count matching input length', async () => {
      const showtimes = [
        { url: 'http://a', cityId: 1, date: '2024-08-15' },
        { url: 'http://b', cityId: 1, date: '2024-08-16' },
      ];

      const result = await service.batchCreateShowtimes(showtimes as any);

      expect(result).toEqual({ count: 2 });
    });
  });

  describe('processShowtime', () => {
    it('throws NotFoundException when showtime not found', async () => {
      mockDb.query.showtimes.findFirst.mockResolvedValue(undefined);

      await expect(
        service.processShowtime(999, { movieId: 1, screenings: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('skips screenings when movieId is null', async () => {
      mockDb.query.showtimes.findFirst.mockResolvedValue({ id: 1 });

      const result = await service.processShowtime(1, {
        movieId: null,
        screenings: [],
      } as any);

      expect(result).toEqual({ movieId: null, screeningsCount: 0 });
    });

    it('inserts screenings and marks showtime as processed', async () => {
      mockDb.query.showtimes.findFirst.mockResolvedValue({ id: 1 });

      const dto = {
        movieId: 5,
        screenings: [
          {
            url: 'http://ticket',
            cinemaId: 1,
            type: '2D',
            date: '2024-08-15T18:00:00Z',
            isDubbing: false,
            isSubtitled: false,
          },
        ],
      };

      const result = await service.processShowtime(1, dto as any);

      expect(result).toEqual({ movieId: 5, screeningsCount: 1 });
    });
  });
});
