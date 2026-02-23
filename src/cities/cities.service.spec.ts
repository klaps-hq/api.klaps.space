import { Test } from '@nestjs/testing';
import { CitiesService } from './cities.service';
import { ScreeningsService } from '../screenings/screenings.service';
import { DRIZZLE } from '../database/constants';

describe('CitiesService', () => {
  let service: CitiesService;
  let mockDb: any;
  let mockScreeningsService: any;

  beforeEach(async () => {
    const mockInsertChain = {
      values: jest.fn().mockReturnThis(),
      onDuplicateKeyUpdate: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      query: {
        cities: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn().mockReturnValue(mockInsertChain),
    };

    mockScreeningsService = {
      getScreenings: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CitiesService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: ScreeningsService, useValue: mockScreeningsService },
      ],
    }).compile();

    service = module.get(CitiesService);
  });

  describe('getCities', () => {
    it('returns mapped cities', async () => {
      mockDb.query.cities.findMany.mockResolvedValue([
        {
          id: 1,
          slug: 'warszawa',
          name: 'Warszawa',
          nameDeclinated: 'Warszawie',
          sourceId: 10,
          areacode: '22',
        },
        {
          id: 2,
          slug: 'krakow',
          name: 'Kraków',
          nameDeclinated: 'Krakowie',
          sourceId: 11,
          areacode: '12',
        },
      ]);

      const result = await service.getCities();

      expect(result).toEqual([
        {
          id: 1,
          slug: 'warszawa',
          name: 'Warszawa',
          nameDeclinated: 'Warszawie',
        },
        { id: 2, slug: 'krakow', name: 'Kraków', nameDeclinated: 'Krakowie' },
      ]);
    });

    it('returns empty array when no cities exist', async () => {
      mockDb.query.cities.findMany.mockResolvedValue([]);
      expect(await service.getCities()).toEqual([]);
    });
  });

  describe('getCityByIdOrSlug', () => {
    it('returns city with screenings when found by id', async () => {
      mockDb.query.cities.findFirst.mockResolvedValue({
        id: 1,
        slug: 'warszawa',
        name: 'Warszawa',
        nameDeclinated: 'Warszawie',
      });
      mockScreeningsService.getScreenings.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const result = await service.getCityByIdOrSlug('1');

      expect(result).toEqual({
        city: {
          id: 1,
          slug: 'warszawa',
          name: 'Warszawa',
          nameDeclinated: 'Warszawie',
        },
        screenings: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      });
      expect(mockScreeningsService.getScreenings).toHaveBeenCalledWith({
        cityId: 1,
      });
    });

    it('returns null when city not found', async () => {
      mockDb.query.cities.findFirst.mockResolvedValue(undefined);

      const result = await service.getCityByIdOrSlug('999');

      expect(result).toBeNull();
      expect(mockScreeningsService.getScreenings).not.toHaveBeenCalled();
    });
  });

  describe('createCity', () => {
    it('upserts and returns the city', async () => {
      const dto = {
        sourceId: 10,
        name: 'Gdańsk',
        nameDeclinated: 'Gdańsku',
        areacode: 58,
      };
      const cityRow = { id: 3, ...dto };
      mockDb.query.cities.findFirst.mockResolvedValue(cityRow);

      const result = await service.createCity(dto);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(cityRow);
    });
  });

  describe('batchCreateCities', () => {
    it('returns count 0 for empty array', async () => {
      const result = await service.batchCreateCities([]);

      expect(result).toEqual({ count: 0 });
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('returns count matching input length', async () => {
      const cities = [
        { sourceId: 1, name: 'A', nameDeclinated: 'A', areacode: 1 },
        { sourceId: 2, name: 'B', nameDeclinated: 'B', areacode: 2 },
      ];

      const result = await service.batchCreateCities(cities);

      expect(result).toEqual({ count: 2 });
    });
  });
});
