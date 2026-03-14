import { Test } from '@nestjs/testing';
import { CinemasRepository } from './cinemas.repository';
import { DRIZZLE } from '../database/constants';
import { sortAndChunk } from '../lib/chunked-upsert';
import { withDeadlockRetry } from '../lib/with-deadlock-retry';
import { toSlug, uniqueSlug } from '../lib/slug';

jest.mock('../lib/chunked-upsert', () => ({
  sortAndChunk: jest.fn((items) => [items]),
}));
jest.mock('../lib/with-deadlock-retry', () => ({
  withDeadlockRetry: jest.fn((fn) => fn()),
}));
jest.mock('../lib/slug', () => ({
  toSlug: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  uniqueSlug: jest.fn((slug: string) => slug),
}));

describe('CinemasRepository', () => {
  let repository: CinemasRepository;

  const mockOnDuplicateKeyUpdate = jest.fn();
  const mockValues = jest
    .fn()
    .mockReturnValue({ onConflictDoUpdate: mockOnDuplicateKeyUpdate });
  const mockWhere = jest.fn();
  const mockSet = jest.fn().mockReturnValue({ where: mockWhere });

  const mockDb = {
    query: {
      cinemas: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn().mockReturnValue({ values: mockValues }),
    update: jest.fn().mockReturnValue({ set: mockSet }),
    select: jest
      .fn()
      .mockReturnValue({ from: jest.fn().mockResolvedValue([]) }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue([]),
    });

    const module = await Test.createTestingModule({
      providers: [CinemasRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repository = module.get(CinemasRepository);
  });

  describe('findAll', () => {
    it('should call findMany without where when no sourceCityId', async () => {
      const expected = [{ id: 1, name: 'Cinema 1' }];
      mockDb.query.cinemas.findMany.mockResolvedValue(expected);

      const result = await repository.findAll();

      expect(mockDb.query.cinemas.findMany).toHaveBeenCalledWith({
        where: undefined,
        with: { city: true },
      });
      expect(result).toEqual(expected);
    });

    it('should call findMany with where condition when sourceCityId provided', async () => {
      const expected = [{ id: 2, name: 'Cinema 2' }];
      mockDb.query.cinemas.findMany.mockResolvedValue(expected);

      const result = await repository.findAll(10);

      expect(mockDb.query.cinemas.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
        with: { city: true },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findBySlug', () => {
    it('should return cinema when found', async () => {
      const expected = { id: 1, slug: 'kino-muranow', name: 'Kino Muranow' };
      mockDb.query.cinemas.findFirst.mockResolvedValue(expected);

      const result = await repository.findBySlug('kino-muranow');

      expect(mockDb.query.cinemas.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
        with: { city: true },
      });
      expect(result).toEqual(expected);
    });

    it('should return undefined when cinema not found', async () => {
      mockDb.query.cinemas.findFirst.mockResolvedValue(undefined);

      const result = await repository.findBySlug('nieistniejace');

      expect(result).toBeUndefined();
    });
  });

  describe('upsertBatch', () => {
    it('should return early when array is empty', async () => {
      await repository.upsertBatch([]);

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should generate slugs and call insert with onConflictDoUpdate', async () => {
      const cinemas = [
        {
          sourceId: 101,
          name: 'Kino Muranow',
          url: 'https://filmweb.pl/cinema/kino-muranow',
          sourceCityId: 10,
        },
      ];

      await repository.upsertBatch(cinemas as any);

      expect(toSlug).toHaveBeenCalledWith('Kino Muranow');
      expect(uniqueSlug).toHaveBeenCalledWith('kino-muranow', expect.any(Set));
      expect(sortAndChunk).toHaveBeenCalledWith(
        [{ ...cinemas[0], slug: 'kino-muranow' }],
        expect.any(Function),
      );
      expect(withDeadlockRetry).toHaveBeenCalledWith(expect.any(Function), {
        label: 'createCinemasBatch',
      });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith([
        { ...cinemas[0], slug: 'kino-muranow' },
      ]);
      expect(mockOnDuplicateKeyUpdate).toHaveBeenCalledWith({
        target: expect.anything(),
        set: expect.objectContaining({
          name: expect.anything(),
          url: expect.anything(),
          sourceCityId: expect.anything(),
          longitude: expect.anything(),
          latitude: expect.anything(),
          street: expect.anything(),
        }),
      });
    });

    it('should accumulate slugs across batch items', async () => {
      const cinemas = [
        {
          sourceId: 101,
          name: 'Kino A',
          url: 'https://filmweb.pl/a',
          sourceCityId: 10,
        },
        {
          sourceId: 102,
          name: 'Kino B',
          url: 'https://filmweb.pl/b',
          sourceCityId: 10,
        },
      ];

      await repository.upsertBatch(cinemas as any);

      expect(toSlug).toHaveBeenCalledTimes(2);
      expect(uniqueSlug).toHaveBeenCalledTimes(2);
      // Second call should receive a Set that already contains first slug
      const secondCallSet = (uniqueSlug as jest.Mock).mock.calls[1][1];
      expect(secondCallSet.has('kino-a')).toBe(true);
    });
  });

  describe('updateBySlug', () => {
    it('should update and return cinema when found', async () => {
      const expected = {
        id: 1,
        slug: 'kino-muranow',
        name: 'Kino Muranow',
        city: { id: 5, slug: 'warszawa', name: 'Warszawa' },
      };
      mockDb.query.cinemas.findFirst.mockResolvedValue(expected);

      const result = await repository.updateBySlug('kino-muranow', {
        description: 'Updated description',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        description: 'Updated description',
        updatedAt: expect.any(Date),
      });
      expect(mockWhere).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('should return null when cinema not found after update', async () => {
      mockDb.query.cinemas.findFirst.mockResolvedValue(undefined);

      const result = await repository.updateBySlug('nieistniejace', {
        description: 'Test',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
