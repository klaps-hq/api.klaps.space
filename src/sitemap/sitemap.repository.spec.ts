import { Test } from '@nestjs/testing';
import { SitemapRepository } from './sitemap.repository';
import { DRIZZLE } from '../database/constants';

const updatedAt = new Date('2024-01-01T00:00:00.000Z');

const mockDb = {
  select: jest.fn(),
};

/** Builds a select().from().leftJoin()...groupBy() chain resolving to rows. */
const mockSelectChain = (rows: unknown[], { innerJoin = false } = {}) => {
  const groupBy = jest.fn().mockResolvedValue(rows);
  const leftJoin = jest.fn();
  // Allow chained leftJoin calls (genres uses two) ending with groupBy.
  leftJoin.mockReturnValue({ leftJoin, groupBy });
  const from = innerJoin
    ? jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({ leftJoin }),
      })
    : jest.fn().mockReturnValue({ leftJoin });
  mockDb.select.mockReturnValue({ from });
  return { from, leftJoin, groupBy };
};

describe('SitemapRepository', () => {
  let repository: SitemapRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [SitemapRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repository = module.get(SitemapRepository);
  });

  describe('findMovieEntries', () => {
    it('should return movie slugs with effective updatedAt', async () => {
      const rows = [{ slug: 'pan-tadeusz-1999', updatedAt }];
      const { groupBy } = mockSelectChain(rows);

      const result = await repository.findMovieEntries();

      expect(result).toEqual(rows);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(groupBy).toHaveBeenCalled();
    });
  });

  describe('findCinemaEntries', () => {
    it('should return cinema slugs with effective updatedAt', async () => {
      const rows = [{ slug: 'kino-muranow', updatedAt }];
      mockSelectChain(rows);

      const result = await repository.findCinemaEntries();

      expect(result).toEqual(rows);
    });
  });

  describe('findCityEntries', () => {
    it('should return only cities joined with cinemas', async () => {
      const rows = [{ slug: 'warszawa', updatedAt }];
      mockSelectChain(rows, { innerJoin: true });

      const result = await repository.findCityEntries();

      expect(result).toEqual(rows);
    });
  });

  describe('findGenreEntries', () => {
    it('should return genre slugs with effective updatedAt', async () => {
      const rows = [{ slug: 'dramat', updatedAt }];
      const { leftJoin } = mockSelectChain(rows);

      const result = await repository.findGenreEntries();

      expect(result).toEqual(rows);
      // Genres join through movies_genres and movies.
      expect(leftJoin).toHaveBeenCalledTimes(2);
    });
  });
});
