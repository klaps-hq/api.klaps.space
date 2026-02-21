import { Test } from '@nestjs/testing';
import { CinemasService } from './cinemas.service';
import { DRIZZLE } from '../database/constants';

describe('CinemasService', () => {
  let service: CinemasService;
  let mockDb: any;

  beforeEach(async () => {
    const mockInsertChain = {
      values: jest.fn().mockReturnThis(),
      onDuplicateKeyUpdate: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      query: {
        cinemas: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn().mockReturnValue(mockInsertChain),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        CinemasService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get(CinemasService);
  });

  describe('getCinemas', () => {
    it('groups cinemas by city sorted by count descending', async () => {
      mockDb.query.cinemas.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Kino A',
          street: 'ul. A',
          city: { id: 10, name: 'Warszawa', nameDeclinated: 'Warszawie' },
        },
        {
          id: 2,
          name: 'Kino B',
          street: 'ul. B',
          city: { id: 10, name: 'Warszawa', nameDeclinated: 'Warszawie' },
        },
        {
          id: 3,
          name: 'Kino C',
          street: null,
          city: { id: 11, name: 'Kraków', nameDeclinated: 'Krakowie' },
        },
      ]);

      const result = await service.getCinemas();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].city.name).toBe('Warszawa');
      expect(result.data[0].cinemas).toHaveLength(2);
      expect(result.data[1].city.name).toBe('Kraków');
      expect(result.data[1].cinemas).toHaveLength(1);
    });

    it('returns empty data when no cinemas', async () => {
      mockDb.query.cinemas.findMany.mockResolvedValue([]);

      const result = await service.getCinemas();

      expect(result.data).toEqual([]);
    });
  });

  describe('getCinemaById', () => {
    it('returns mapped cinema when found', async () => {
      mockDb.query.cinemas.findFirst.mockResolvedValue({
        id: 1,
        name: 'Kino Luna',
        street: 'ul. Test',
        url: 'https://filmweb.pl/cinema/1',
        latitude: 52.2,
        longitude: 21.0,
        city: { id: 10, name: 'Warszawa', nameDeclinated: 'Warszawie' },
      });

      const result = await service.getCinemaById(1);

      expect(result).not.toBeNull();
      expect(result!.filmwebUrl).toBe('https://filmweb.pl/cinema/1');
      expect(result!.latitude).toBe(52.2);
    });

    it('returns null when cinema not found', async () => {
      mockDb.query.cinemas.findFirst.mockResolvedValue(undefined);

      const result = await service.getCinemaById(999);

      expect(result).toBeNull();
    });
  });

  describe('batchCreateCinemas', () => {
    it('returns count 0 for empty array', async () => {
      const result = await service.batchCreateCinemas([]);

      expect(result).toEqual({ count: 0 });
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('returns count matching input length', async () => {
      const cinemas = [
        { sourceId: 1, name: 'A', url: 'http://a', sourceCityId: 1 },
        { sourceId: 2, name: 'B', url: 'http://b', sourceCityId: 1 },
      ];

      const result = await service.batchCreateCinemas(cinemas as any);

      expect(result).toEqual({ count: 2 });
    });
  });
});
