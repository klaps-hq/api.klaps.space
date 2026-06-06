import { Test } from '@nestjs/testing';
import { SitemapRepository } from './sitemap.repository';
import { DRIZZLE } from '../database/constants';

const updatedAt = new Date('2024-01-01T00:00:00.000Z');

const mockDb = {
  select: jest.fn(),
  selectDistinct: jest.fn(),
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
    it('should select movie slugs with updatedAt', async () => {
      const rows = [{ slug: 'pan-tadeusz-1999', updatedAt }];
      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue(rows),
      });

      const result = await repository.findMovieEntries();

      expect(result).toEqual(rows);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('findCinemaEntries', () => {
    it('should select cinema slugs with updatedAt', async () => {
      const rows = [{ slug: 'kino-muranow', updatedAt }];
      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue(rows),
      });

      const result = await repository.findCinemaEntries();

      expect(result).toEqual(rows);
    });
  });

  describe('findCityEntriesWithCinemas', () => {
    it('should select distinct city slugs joined with cinemas', async () => {
      const rows = [{ slug: 'warszawa' }];
      const mockInnerJoin = jest.fn().mockResolvedValue(rows);
      mockDb.selectDistinct.mockReturnValue({
        from: jest.fn().mockReturnValue({ innerJoin: mockInnerJoin }),
      });

      const result = await repository.findCityEntriesWithCinemas();

      expect(result).toEqual(rows);
      expect(mockDb.selectDistinct).toHaveBeenCalledTimes(1);
      expect(mockInnerJoin).toHaveBeenCalled();
    });
  });

  describe('findGenreEntries', () => {
    it('should select genre slugs with updatedAt', async () => {
      const rows = [{ slug: 'dramat', updatedAt }];
      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue(rows),
      });

      const result = await repository.findGenreEntries();

      expect(result).toEqual(rows);
    });
  });
});
