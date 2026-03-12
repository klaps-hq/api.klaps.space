import { Test } from '@nestjs/testing';
import { CitiesService } from './cities.service';
import { CitiesRepository } from './cities.repository';
import { ScreeningsService } from '../screenings/screenings.service';
import { getDateRangeUpToMonthFromNow } from '../lib/date';

describe('CitiesService', () => {
  let service: CitiesService;
  let repo: jest.Mocked<CitiesRepository>;
  let screeningsService: jest.Mocked<ScreeningsService>;

  const mockCity = {
    id: 5,
    sourceId: 10,
    slug: 'warszawa',
    name: 'Warszawa',
    nameDeclinated: 'Warszawie',
    areacode: null,
    population: null,
    description: 'Stolica Polski',
    lastScrapedAt: new Date('2025-06-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
  };

  const mockCityWithCount = {
    ...mockCity,
    numberOfCinemas: 12,
  };

  const mockScreening = {
    id: 1,
    movieTitle: 'Zimna wojna',
    movieSlug: 'zimna-wojna',
    cinemaName: 'Kino Muranow',
    date: '2025-06-15',
    time: '20:00',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CitiesService,
        {
          provide: CitiesRepository,
          useValue: {
            findAll: jest.fn(),
            findBySlug: jest.fn(),
            findWithCinemaCount: jest.fn(),
            countCinemasBySourceId: jest.fn(),
            findScrapedCityIds: jest.fn(),
            upsertBatch: jest.fn(),
            updateBySlug: jest.fn(),
          },
        },
        {
          provide: ScreeningsService,
          useValue: {
            getScreenings: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CitiesService);
    repo = module.get(CitiesRepository);
    screeningsService = module.get(ScreeningsService);
  });

  const mockCityResponse = {
    id: 5,
    slug: 'warszawa',
    name: 'Warszawa',
    nameDeclinated: 'Warszawie',
    population: null,
    description: 'Stolica Polski',
  };

  describe('getCities', () => {
    it('should return mapped city responses', async () => {
      repo.findAll.mockResolvedValue([mockCity as any]);

      const result = await service.getCities();

      expect(repo.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockCityResponse]);
    });
  });

  describe('findBySlug', () => {
    it('should return city when found', async () => {
      repo.findBySlug.mockResolvedValue(mockCity as any);

      const result = await service.findBySlug('warszawa');

      expect(repo.findBySlug).toHaveBeenCalledWith('warszawa');
      expect(result).toEqual(mockCity);
    });

    it('should return null when city not found', async () => {
      repo.findBySlug.mockResolvedValue(undefined);

      const result = await service.findBySlug('nieistniejace');

      expect(result).toBeNull();
    });
  });

  describe('getCitiesWithCinemas', () => {
    it('should return mapped cities with numberOfCinemas', async () => {
      repo.findWithCinemaCount.mockResolvedValue([mockCityWithCount as any]);

      const result = await service.getCitiesWithCinemas();

      expect(repo.findWithCinemaCount).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 5,
          slug: 'warszawa',
          name: 'Warszawa',
          nameDeclinated: 'Warszawie',
          population: null,
          description: 'Stolica Polski',
          numberOfCinemas: 12,
        },
      ]);
    });
  });

  describe('getCityBySlug', () => {
    it('should return mapped city with screenings when found', async () => {
      repo.findBySlug.mockResolvedValue(mockCity as any);
      repo.countCinemasBySourceId.mockResolvedValue(12);
      screeningsService.getScreenings.mockResolvedValue([mockScreening as any]);

      const result = await service.getCityBySlug('warszawa');

      expect(repo.findBySlug).toHaveBeenCalledWith('warszawa');
      expect(screeningsService.getScreenings).toHaveBeenCalledWith({
        cityId: 5,
      });
      expect(repo.countCinemasBySourceId).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        city: {
          id: 5,
          slug: 'warszawa',
          name: 'Warszawa',
          nameDeclinated: 'Warszawie',
          population: null,
          description: 'Stolica Polski',
          numberOfCinemas: 12,
        },
        screenings: [mockScreening],
      });
    });

    it('should return null when city not found', async () => {
      repo.findBySlug.mockResolvedValue(undefined);

      const result = await service.getCityBySlug('nieistniejace');

      expect(result).toBeNull();
    });
  });

  describe('getScrapedCities', () => {
    it('should delegate to repo with parsed dates', async () => {
      repo.findScrapedCityIds.mockResolvedValue([10, 20, 30]);

      const query = {
        dateFrom: '2025-06-01',
        dateTo: '2025-06-30',
        cityId: undefined,
        citySlug: undefined,
      } as any;
      const result = await service.getScrapedCities(query);

      const { startDay, endDay } = getDateRangeUpToMonthFromNow(
        '2025-06-01',
        '2025-06-30',
      );
      expect(repo.findScrapedCityIds).toHaveBeenCalledWith(
        startDay,
        endDay,
        undefined,
        undefined,
      );
      expect(result).toEqual([10, 20, 30]);
    });

    it('should default to current date when dateFrom/dateTo not provided', async () => {
      repo.findScrapedCityIds.mockResolvedValue([]);

      const query = {} as any;
      await service.getScrapedCities(query);

      const [startDay, endDay] = repo.findScrapedCityIds.mock.calls[0];
      expect(startDay).toBeInstanceOf(Date);
      expect(endDay).toBeInstanceOf(Date);
    });
  });

  describe('createCitiesBatch', () => {
    it('should delegate to repo.upsertBatch', async () => {
      const cities = [
        {
          sourceId: 50,
          name: 'Gdansk',
          slug: 'gdansk',
          nameDeclinated: 'Gdansku',
        },
      ];
      repo.upsertBatch.mockResolvedValue(undefined);

      await service.createCitiesBatch(cities as any);

      expect(repo.upsertBatch).toHaveBeenCalledWith(cities);
    });
  });

  describe('updateCityBySlug', () => {
    it('should return mapped city response after update', async () => {
      repo.updateBySlug.mockResolvedValue(mockCity as any);

      const result = await service.updateCityBySlug('warszawa', {
        description: 'Nowy opis',
      } as any);

      expect(repo.updateBySlug).toHaveBeenCalledWith('warszawa', {
        description: 'Nowy opis',
      });
      expect(result).toEqual(mockCityResponse);
    });

    it('should return null when city not found', async () => {
      repo.updateBySlug.mockResolvedValue(null);

      const result = await service.updateCityBySlug('nieistniejace', {
        description: 'test',
      } as any);

      expect(result).toBeNull();
    });
  });
});
