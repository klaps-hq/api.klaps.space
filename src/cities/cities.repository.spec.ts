import { Test } from '@nestjs/testing';
import { CitiesRepository } from './cities.repository';
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

const mockOnDuplicateKeyUpdate = jest.fn();
const mockValues = jest
  .fn()
  .mockReturnValue({ onDuplicateKeyUpdate: mockOnDuplicateKeyUpdate });

const createSelectChain = (resolvedValue: any[] = []) => {
  const chain: any = {};
  const methods = [
    'from',
    'where',
    'innerJoin',
    'leftJoin',
    'groupBy',
    'having',
    'limit',
    'orderBy',
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve(resolvedValue);
  return chain;
};

let selectChain = createSelectChain();
const mockSelect = jest.fn().mockReturnValue(selectChain);

const mockSetUpdate = jest.fn().mockReturnValue({ where: jest.fn() });
const mockUpdate = jest.fn().mockReturnValue({ set: mockSetUpdate });

const mockDb = {
  query: {
    cities: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(undefined),
    },
  },
  insert: jest.fn().mockReturnValue({ values: mockValues }),
  update: mockUpdate,
  select: mockSelect,
};

describe('CitiesRepository', () => {
  let repository: CitiesRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CitiesRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repository = module.get(CitiesRepository);

    jest.clearAllMocks();

    // Re-apply default return values after clearAllMocks
    selectChain = createSelectChain();
    mockValues.mockReturnValue({
      onDuplicateKeyUpdate: mockOnDuplicateKeyUpdate,
    });
    mockSelect.mockReturnValue(selectChain);
    mockUpdate.mockReturnValue({ set: mockSetUpdate });
    mockSetUpdate.mockReturnValue({ where: jest.fn() });
    mockDb.query.cities.findMany.mockResolvedValue([]);
    mockDb.query.cities.findFirst.mockResolvedValue(undefined);
  });

  // === findAll ===

  describe('findAll', () => {
    it('should return all cities', async () => {
      const cities = [
        { id: 1, slug: 'warszawa', name: 'Warszawa' },
        { id: 2, slug: 'krakow', name: 'Kraków' },
      ];
      mockDb.query.cities.findMany.mockResolvedValueOnce(cities);

      const result = await repository.findAll();

      expect(result).toEqual(cities);
      expect(mockDb.query.cities.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no cities', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  // === findWithCinemaCount ===

  describe('findWithCinemaCount', () => {
    it('should select cities with cinema count using inner join and group by', async () => {
      const citiesWithCount = [
        { id: 1, slug: 'warszawa', name: 'Warszawa', numberOfCinemas: 5 },
      ];
      selectChain = createSelectChain(citiesWithCount);
      mockSelect.mockReturnValue(selectChain);

      const result = await repository.findWithCinemaCount();

      expect(result).toEqual(citiesWithCount);
      expect(mockSelect).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
      expect(selectChain.innerJoin).toHaveBeenCalled();
      expect(selectChain.groupBy).toHaveBeenCalled();
    });
  });

  // === findBySlug ===

  describe('findBySlug', () => {
    it('should find city by slug', async () => {
      const city = { id: 1, slug: 'warszawa', name: 'Warszawa' };
      mockDb.query.cities.findFirst.mockResolvedValueOnce(city);

      const result = await repository.findBySlug('warszawa');

      expect(result).toEqual(city);
      expect(mockDb.query.cities.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('should return undefined when city not found', async () => {
      const result = await repository.findBySlug('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  // === countCinemasBySourceId ===

  describe('countCinemasBySourceId', () => {
    it('should return cinema count for given source city id', async () => {
      selectChain = createSelectChain([{ count: 7 }]);
      mockSelect.mockReturnValue(selectChain);

      const result = await repository.countCinemasBySourceId(42);

      expect(result).toBe(7);
      expect(mockSelect).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
    });
  });

  // === findScrapedCityIds ===

  describe('findScrapedCityIds', () => {
    it('should return city ids matching date range', async () => {
      const startDay = new Date('2026-01-01');
      const endDay = new Date('2026-01-31');
      selectChain = createSelectChain([{ id: 1 }, { id: 3 }]);
      mockSelect.mockReturnValue(selectChain);

      const result = await repository.findScrapedCityIds(startDay, endDay);

      expect(result).toEqual([1, 3]);
    });

    it('should return empty array when no cities match', async () => {
      const startDay = new Date('2026-01-01');
      const endDay = new Date('2026-01-31');

      const result = await repository.findScrapedCityIds(startDay, endDay);

      expect(result).toEqual([]);
    });

    it('should accept optional cityId and citySlug', async () => {
      const startDay = new Date('2026-01-01');
      const endDay = new Date('2026-01-31');
      selectChain = createSelectChain([{ id: 5 }]);
      mockSelect.mockReturnValue(selectChain);

      const result = await repository.findScrapedCityIds(
        startDay,
        endDay,
        5,
        'warszawa',
      );

      expect(result).toEqual([5]);
    });
  });

  // === upsertBatch ===

  describe('upsertBatch', () => {
    it('should return early for empty array', async () => {
      await repository.upsertBatch([]);

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(sortAndChunk).not.toHaveBeenCalled();
    });

    it('should generate slugs and upsert cities', async () => {
      // findExistingSlugs returns empty set (select().from() resolves to [])

      const cities = [
        { sourceId: 1, name: 'Warszawa', nameDeclinated: 'Warszawie' },
        { sourceId: 2, name: 'Kraków', nameDeclinated: 'Krakowie' },
      ];

      await repository.upsertBatch(cities);

      expect(toSlug).toHaveBeenCalledWith('Warszawa');
      expect(toSlug).toHaveBeenCalledWith('Kraków');
      expect(uniqueSlug).toHaveBeenCalledTimes(2);
      expect(sortAndChunk).toHaveBeenCalled();
      expect(withDeadlockRetry).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ sourceId: 1, slug: 'warszawa' }),
          expect.objectContaining({ sourceId: 2, slug: 'kraków' }),
        ]),
      );
      expect(mockOnDuplicateKeyUpdate).toHaveBeenCalledWith({
        set: expect.objectContaining({
          name: expect.anything(),
          nameDeclinated: expect.anything(),
          areacode: expect.anything(),
        }),
      });
    });
  });

  // === updateBySlug ===

  describe('updateBySlug', () => {
    it('should update and return the updated city', async () => {
      const updated = {
        id: 1,
        slug: 'warszawa',
        name: 'Warszawa',
        description: 'Stolica',
      };
      mockDb.query.cities.findFirst.mockResolvedValueOnce(updated);

      const result = await repository.updateBySlug('warszawa', {
        description: 'Stolica',
      });

      expect(result).toEqual(updated);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should return null when city not found after update', async () => {
      mockDb.query.cities.findFirst.mockResolvedValueOnce(undefined);

      const result = await repository.updateBySlug('nonexistent', {
        description: 'Test',
      });

      expect(result).toBeNull();
    });
  });
});
