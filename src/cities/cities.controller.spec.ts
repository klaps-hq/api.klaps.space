import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';

describe('CitiesController', () => {
  let controller: CitiesController;
  let service: jest.Mocked<CitiesService>;

  const mockCityResponse = {
    id: 5,
    slug: 'warszawa',
    name: 'Warszawa',
    nameDeclinated: 'Warszawie',
    population: null,
    description: 'Stolica Polski',
    voivodeship: 'mazowieckie',
    numberOfCinemas: 12,
  };

  const mockCityDetailResponse = {
    city: mockCityResponse,
    screenings: [
      { id: 1, movieTitle: 'Zimna wojna', date: '2025-06-15', time: '20:00' },
    ],
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CitiesController],
      providers: [
        {
          provide: CitiesService,
          useValue: {
            getCities: jest.fn(),
            getScrapedCities: jest.fn(),
            getCitiesWithCinemas: jest.fn(),
            getCityBySlug: jest.fn(),
            createCitiesBatch: jest.fn(),
            updateCityBySlug: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(CitiesController);
    service = module.get(CitiesService);
  });

  describe('getCities', () => {
    it('should delegate to service.getCities', async () => {
      service.getCities.mockResolvedValue([mockCityResponse]);

      const result = await controller.getCities();

      expect(service.getCities).toHaveBeenCalled();
      expect(result).toEqual([mockCityResponse]);
    });
  });

  describe('getScrapedCities', () => {
    it('should delegate query to service.getScrapedCities', async () => {
      service.getScrapedCities.mockResolvedValue([10, 20]);

      const query = { dateFrom: '2025-06-01', dateTo: '2025-06-30' } as any;
      const result = await controller.getScrapedCities(query);

      expect(service.getScrapedCities).toHaveBeenCalledWith(query);
      expect(result).toEqual([10, 20]);
    });
  });

  describe('getCitiesWithCinemas', () => {
    it('should delegate to service.getCitiesWithCinemas', async () => {
      service.getCitiesWithCinemas.mockResolvedValue([mockCityResponse]);

      const result = await controller.getCitiesWithCinemas({});

      expect(service.getCitiesWithCinemas).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([mockCityResponse]);
    });

    it('should pass voivodeship filter to service', async () => {
      service.getCitiesWithCinemas.mockResolvedValue([mockCityResponse]);

      const result = await controller.getCitiesWithCinemas({
        voivodeship: 'mazowieckie',
      });

      expect(service.getCitiesWithCinemas).toHaveBeenCalledWith('mazowieckie');
      expect(result).toEqual([mockCityResponse]);
    });
  });

  describe('getCityBySlug', () => {
    it('should return city detail when found', async () => {
      service.getCityBySlug.mockResolvedValue(mockCityDetailResponse as any);

      const result = await controller.getCityBySlug('warszawa');

      expect(service.getCityBySlug).toHaveBeenCalledWith('warszawa');
      expect(result).toEqual(mockCityDetailResponse);
    });

    it('should throw NotFoundException when city not found', async () => {
      service.getCityBySlug.mockResolvedValue(null);

      await expect(controller.getCityBySlug('nieistniejace')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCitiesBatch', () => {
    it('should delegate dto.cities to service', async () => {
      const cities = [
        {
          sourceId: 50,
          name: 'Gdansk',
          slug: 'gdansk',
          nameDeclinated: 'Gdansku',
        },
      ];
      service.createCitiesBatch.mockResolvedValue(undefined);

      await controller.createCitiesBatch({ cities });

      expect(service.createCitiesBatch).toHaveBeenCalledWith(cities);
    });
  });

  describe('updateCityBySlug', () => {
    it('should return updated city when found', async () => {
      service.updateCityBySlug.mockResolvedValue(mockCityResponse);

      const body = { description: 'Zaktualizowany opis' } as any;
      const result = await controller.updateCityBySlug('warszawa', body);

      expect(service.updateCityBySlug).toHaveBeenCalledWith('warszawa', body);
      expect(result).toEqual(mockCityResponse);
    });

    it('should throw NotFoundException when city not found', async () => {
      service.updateCityBySlug.mockResolvedValue(null);

      await expect(
        controller.updateCityBySlug('nieistniejace', {
          description: 'test',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
