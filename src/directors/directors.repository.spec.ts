import { Test } from '@nestjs/testing';
import { DirectorsRepository } from './directors.repository';
import { DRIZZLE } from '../database/constants';

const createChain = () => {
  const queue: unknown[][] = [];
  const chain: Record<string, unknown> = {};
  [
    'from',
    'where',
    'innerJoin',
    'leftJoin',
    'groupBy',
    'orderBy',
    'limit',
    'offset',
  ].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: (rows: unknown[]) => unknown) =>
    resolve(queue.length ? queue.shift()! : []);
  chain.enqueue = (v: unknown[]) => {
    queue.push(v);
    return chain;
  };
  return chain as Record<string, jest.Mock> & {
    then: (r: (rows: unknown[]) => unknown) => unknown;
    enqueue: (v: unknown[]) => unknown;
  };
};

describe('DirectorsRepository', () => {
  let repository: DirectorsRepository;
  let selectChain: ReturnType<typeof createChain>;
  let mockDb: {
    query: {
      directors: { findMany: jest.Mock; findFirst: jest.Mock };
    };
    select: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    selectChain = createChain();
    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn().mockReturnValue({ where });
    mockDb = {
      query: {
        directors: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(undefined),
        },
      },
      select: jest.fn().mockReturnValue(selectChain),
      update: jest.fn().mockReturnValue({ set }),
    };

    const module = await Test.createTestingModule({
      providers: [DirectorsRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repository = module.get(DirectorsRepository);
  });

  describe('findAll', () => {
    it('returns directors ordered by name with limit/offset', async () => {
      const directors = [{ id: 1, slug: 'aaa', name: 'Aaa' }];
      mockDb.query.directors.findMany.mockResolvedValue(directors);

      const result = await repository.findAll({ limit: 20, offset: 0 });

      expect(result).toEqual(directors);
      expect(mockDb.query.directors.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
          limit: 20,
          offset: 0,
        }),
      );
    });

    it('applies a where filter when search provided', async () => {
      await repository.findAll({ search: 'pawlikowski' });

      expect(mockDb.query.directors.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.anything() }),
      );
    });
  });

  describe('count', () => {
    it('returns the count from the DB', async () => {
      selectChain.enqueue([{ count: 5 }]);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('queries by slug', async () => {
      const director = { id: 1, slug: 'pawel-pawlikowski' };
      mockDb.query.directors.findFirst.mockResolvedValue(director);

      const result = await repository.findBySlug('pawel-pawlikowski');

      expect(result).toEqual(director);
      expect(mockDb.query.directors.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('returns undefined when not found', async () => {
      mockDb.query.directors.findFirst.mockResolvedValue(undefined);

      expect(await repository.findBySlug('nope')).toBeUndefined();
    });
  });

  describe('findStats', () => {
    it('returns an empty map for empty ids', async () => {
      expect(await repository.findStats([])).toEqual(new Map());
    });

    it('aggregates movie + upcoming screening counts, defaulting missing to 0', async () => {
      selectChain.enqueue([{ directorId: 1, count: 3 }]); // movie counts
      selectChain.enqueue([{ directorId: 1, count: 7 }]); // upcoming screening counts

      const result = await repository.findStats([1, 2]);

      expect(result.get(1)).toEqual({
        moviesCount: 3,
        upcomingScreeningsCount: 7,
      });
      expect(result.get(2)).toEqual({
        moviesCount: 0,
        upcomingScreeningsCount: 0,
      });
    });
  });

  describe('updateBySlug', () => {
    it('updates and returns the re-fetched director', async () => {
      const updated = {
        id: 1,
        slug: 'pawel-pawlikowski',
        bio: 'Polski reżyser.',
      };
      mockDb.query.directors.findFirst.mockResolvedValue(updated);

      const result = await repository.updateBySlug('pawel-pawlikowski', {
        bio: 'Polski reżyser.',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('returns null when the director is not found after update', async () => {
      mockDb.query.directors.findFirst.mockResolvedValue(undefined);

      const result = await repository.updateBySlug('nieistnieje', { bio: 'x' });

      expect(result).toBeNull();
    });
  });

  describe('findContentUpdatedAt', () => {
    it('returns an empty map for empty ids', async () => {
      expect(await repository.findContentUpdatedAt([])).toEqual(new Map());
    });

    it('maps directorId to its effective updatedAt', async () => {
      const updatedAt = new Date('2026-06-01T00:00:00.000Z');
      selectChain.enqueue([{ directorId: 1, updatedAt }]);

      const result = await repository.findContentUpdatedAt([1]);

      expect(result.get(1)).toEqual(updatedAt);
    });
  });
});
