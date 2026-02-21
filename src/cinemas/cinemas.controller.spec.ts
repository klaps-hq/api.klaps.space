import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CinemasController } from './cinemas.controller';
import { CinemasService } from './cinemas.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

describe('CinemasController', () => {
  let controller: CinemasController;
  const mockService = {
    getCinemas: jest.fn(),
    createCinema: jest.fn(),
    batchCreateCinemas: jest.fn(),
    getCinemaById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [CinemasController],
      providers: [{ provide: CinemasService, useValue: mockService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CinemasController);
  });

  describe('getCinemas', () => {
    it('delegates to service with query params', async () => {
      const expected = { data: [] };
      mockService.getCinemas.mockResolvedValue(expected);

      const result = await controller.getCinemas({ cityId: 1, limit: 10 });

      expect(result).toEqual(expected);
      expect(mockService.getCinemas).toHaveBeenCalledWith({
        cityId: 1,
        limit: 10,
      });
    });
  });

  describe('createCinema', () => {
    it('delegates to service', async () => {
      const dto = {
        sourceId: 1,
        name: 'Kino',
        url: 'http://a',
        sourceCityId: 1,
      } as any;
      const cinema = { id: 1, ...dto };
      mockService.createCinema.mockResolvedValue(cinema);

      const result = await controller.createCinema(dto);

      expect(result).toEqual(cinema);
    });
  });

  describe('batchCreateCinemas', () => {
    it('delegates to service and returns count', async () => {
      mockService.batchCreateCinemas.mockResolvedValue({ count: 2 });

      const result = await controller.batchCreateCinemas({
        cinemas: [{} as any, {} as any],
      });

      expect(result).toEqual({ count: 2 });
    });
  });

  describe('getCinemaById', () => {
    it('returns cinema when found', async () => {
      const cinema = {
        id: 1,
        name: 'Kino',
        street: null,
        city: { id: 1, name: 'W', nameDeclinated: 'W' },
        latitude: null,
        longitude: null,
        filmwebUrl: '',
      };
      mockService.getCinemaById.mockResolvedValue(cinema);

      const result = await controller.getCinemaById(1);

      expect(result).toEqual(cinema);
    });

    it('throws NotFoundException when not found', async () => {
      mockService.getCinemaById.mockResolvedValue(null);

      await expect(controller.getCinemaById(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
