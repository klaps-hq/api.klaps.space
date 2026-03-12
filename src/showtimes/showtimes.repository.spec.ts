import { Test } from '@nestjs/testing';
import { ShowtimesRepository } from './showtimes.repository';
import { DRIZZLE } from '../database/constants';

jest.mock('../lib/chunked-upsert', () => ({
  sortAndChunk: jest.fn((items) => (items.length === 0 ? [] : [items])),
}));
jest.mock('../lib/with-deadlock-retry', () => ({
  withDeadlockRetry: jest.fn((fn) => fn()),
}));

const mockValues = jest.fn();
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

const mockWhere = jest.fn();
const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

const mockDb = {
  query: {
    showtimes: {
      findMany: jest.fn(),
    },
  },
  insert: mockInsert,
  update: mockUpdate,
};

describe('ShowtimesRepository', () => {
  let repo: ShowtimesRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ShowtimesRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repo = module.get(ShowtimesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should call findMany with date range and no cityId', async () => {
      const startDay = new Date('2025-01-01');
      const endDay = new Date('2025-01-31');
      const expected = [{ id: 1, url: 'https://kino.pl/1', cityId: 3 }];
      mockDb.query.showtimes.findMany.mockResolvedValue(expected);

      const result = await repo.findAll(startDay, endDay);

      expect(result).toEqual(expected);
      expect(mockDb.query.showtimes.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('should call findMany with cityId filter when provided', async () => {
      const startDay = new Date('2025-01-01');
      const endDay = new Date('2025-01-31');
      mockDb.query.showtimes.findMany.mockResolvedValue([]);

      const result = await repo.findAll(startDay, endDay, 5);

      expect(result).toEqual([]);
      expect(mockDb.query.showtimes.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });
  });

  describe('upsertBatch', () => {
    it('should return early when showtimes array is empty', async () => {
      await repo.upsertBatch([]);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('should call insert with mapped values', async () => {
      const showtimes = [
        { url: 'https://kino.pl/1', cityId: 3, date: '2025-01-15' },
        { url: 'https://kino.pl/2', cityId: 3, date: '2025-01-16' },
      ];

      await repo.upsertBatch(showtimes);

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith([
        { url: 'https://kino.pl/1', cityId: 3, date: new Date('2025-01-15') },
        { url: 'https://kino.pl/2', cityId: 3, date: new Date('2025-01-16') },
      ]);
    });
  });

  describe('updateCitiesLastScrapedAt', () => {
    it('should call update on cities table', async () => {
      await repo.updateCitiesLastScrapedAt([3, 5]);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({ lastScrapedAt: expect.any(Date) });
      expect(mockWhere).toHaveBeenCalled();
    });
  });
});
