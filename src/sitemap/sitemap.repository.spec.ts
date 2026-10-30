import { Test } from '@nestjs/testing';
import { SitemapRepository } from './sitemap.repository';
import { DRIZZLE } from '../database/constants';
import { CINEMA_CHAIN_SQL_PATTERN } from '../cinemas/cinema-chains';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

const dialect = new PgDialect();
/** Renders a HAVING argument so tests can assert on the generated SQL. */
const render = (clause: SQL) => dialect.sqlToQuery(clause);

const updatedAt = new Date('2024-01-01T00:00:00.000Z');

const mockDb = {
  select: jest.fn(),
};

/**
 * Builds a select().from().leftJoin()...groupBy() chain resolving to rows.
 * With `having`, groupBy returns { having } and having resolves instead.
 */
const mockSelectChain = (
  rows: unknown[],
  { innerJoin = false, having: withHaving = false } = {},
) => {
  const having = jest.fn().mockResolvedValue(rows);
  const groupBy = withHaving
    ? jest.fn().mockReturnValue({ having })
    : jest.fn().mockResolvedValue(rows);
  const leftJoin = jest.fn();
  // Allow chained leftJoin calls (genres and movies use two) ending with groupBy.
  leftJoin.mockReturnValue({ leftJoin, groupBy });
  const from = innerJoin
    ? jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({ leftJoin }),
      })
    : jest.fn().mockReturnValue({ leftJoin });
  mockDb.select.mockReturnValue({ from });
  return { from, leftJoin, groupBy, having };
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
    it('should return only movies with a recent or upcoming screening', async () => {
      const rows = [{ slug: 'pan-tadeusz-1999', updatedAt }];
      const { groupBy, having } = mockSelectChain(rows, { having: true });

      const result = await repository.findMovieEntries();

      expect(result).toEqual(rows);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(groupBy).toHaveBeenCalled();
      expect(having).toHaveBeenCalledTimes(1);
    });

    it('should count only screenings in independent cinemas', async () => {
      const { leftJoin, having } = mockSelectChain([], { having: true });

      await repository.findMovieEntries();

      // screenings, then cinemas for the chain check.
      expect(leftJoin).toHaveBeenCalledTimes(2);
      const { sql, params } = render(having.mock.calls[0][0] as SQL);
      expect(sql).toContain('not coalesce("cinemas"."name" ~*');
      expect(params).toContain(CINEMA_CHAIN_SQL_PATTERN);
    });
  });

  describe('findCinemaEntries', () => {
    it('should return only cinemas with a recent or upcoming screening', async () => {
      const rows = [{ slug: 'kino-muranow', updatedAt }];
      const { having } = mockSelectChain(rows, { having: true });

      const result = await repository.findCinemaEntries();

      expect(result).toEqual(rows);
      expect(having).toHaveBeenCalledTimes(1);
    });

    it('should drop chain venues regardless of upcoming screenings', async () => {
      const { having } = mockSelectChain([], { having: true });

      await repository.findCinemaEntries();

      const { sql, params } = render(having.mock.calls[0][0] as SQL);
      expect(sql).toContain('not coalesce("cinemas"."name" ~*');
      expect(params).toContain(CINEMA_CHAIN_SQL_PATTERN);
      // The old exception for chain venues with an upcoming screening is gone.
      expect(sql).not.toContain('>= CURRENT_DATE)');
    });
  });

  describe('findCityEntries', () => {
    it('should return only cities with cinemas and a recent or upcoming screening', async () => {
      const rows = [{ slug: 'warszawa', updatedAt }];
      const { having } = mockSelectChain(rows, {
        innerJoin: true,
        having: true,
      });

      const result = await repository.findCityEntries();

      expect(result).toEqual(rows);
      expect(having).toHaveBeenCalledTimes(1);
    });

    it('should leave out cities with nothing but chain cinemas', async () => {
      const { having } = mockSelectChain([], {
        innerJoin: true,
        having: true,
      });

      await repository.findCityEntries();

      const { sql, params } = render(having.mock.calls[0][0] as SQL);
      expect(sql).toContain('not coalesce("cinemas"."name" ~*');
      expect(params).toContain(CINEMA_CHAIN_SQL_PATTERN);
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

  describe('findDirectorEntries', () => {
    it('should return director slugs filtered by the independent upcoming-screenings threshold', async () => {
      const rows = [{ slug: 'pawel-pawlikowski', updatedAt }];
      // from → innerJoin → innerJoin → leftJoin → where → groupBy → having.
      const having = jest.fn().mockResolvedValue(rows);
      const groupBy = jest.fn().mockReturnValue({ having });
      const where = jest.fn().mockReturnValue({ groupBy });
      const leftJoin = jest.fn().mockReturnValue({ where });
      const innerJoin2 = jest.fn().mockReturnValue({ leftJoin });
      const innerJoin1 = jest.fn().mockReturnValue({ innerJoin: innerJoin2 });
      const from = jest.fn().mockReturnValue({ innerJoin: innerJoin1 });
      mockDb.select.mockReturnValue({ from });

      const result = await repository.findDirectorEntries();

      expect(result).toEqual(rows);
      const { sql, params } = render(having.mock.calls[0][0] as SQL);
      expect(sql).toContain('>= CURRENT_DATE and not coalesce(');
      expect(params).toContain(CINEMA_CHAIN_SQL_PATTERN);
    });
  });
});
