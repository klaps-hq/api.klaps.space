import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

describe('CitiesController', () => {
  let controller: CitiesController;
  let service: jest.Mocked<CitiesService>;

  beforeEach(async () => {
    const mockService = {
      getCities: jest.fn(),
      getCityByIdOrSlug: jest.fn(),
      batchCreateCities: jest.fn(),
      createCity: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [CitiesController],
      providers: [{ provide: CitiesService, useValue: mockService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CitiesController);
    service = module.get(CitiesService) as jest.Mocked<CitiesService>;
  });

  describe('getCities', () => {
    it('returns cities from service', async () => {
      const cities = [{ id: 1, slug: 'warszawa', name: 'Warszawa', nameDeclinated: 'Warszawie' }];
      service.getCities.mockResolvedValue(cities);

      const result = await controller.getCities();

      expect(result).toEqual(cities);
    });
  });

  describe('getCityByIdOrSlug', () => {
    it('returns city detail when found by id', async () => {
      const detail = {
        city: { id: 1, slug: 'warszawa', name: 'Warszawa', nameDeclinated: 'Warszawie' },
        screenings: {
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        },
      };
      service.getCityByIdOrSlug.mockResolvedValue(detail);

      const result = await controller.getCityByIdOrSlug('1');

      expect(result).toEqual(detail);
    });

    it('throws NotFoundException when not found', async () => {
      service.getCityByIdOrSlug.mockResolvedValue(null);

      await expect(controller.getCityByIdOrSlug('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('batchCreateCities', () => {
    it('delegates to service', async () => {
      service.batchCreateCities.mockResolvedValue({ count: 3 });

      const result = await controller.batchCreateCities({
        cities: [{} as any, {} as any, {} as any],
      });

      expect(result).toEqual({ count: 3 });
    });
  });

  describe('createCity', () => {
    it('delegates to service', async () => {
      const dto = {
        sourceId: 1,
        name: 'Test',
        nameDeclinated: 'Testu',
        areacode: 12,
      } as any;
      const city = { id: 1, ...dto };
      service.createCity.mockResolvedValue(city);

      const result = await controller.createCity(dto);

      expect(result).toEqual(city);
    });
  });
});
