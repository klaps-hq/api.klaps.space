import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CinemasController } from './cinemas.controller';
import { CinemasService } from './cinemas.service';

describe('CinemasController', () => {
  let controller: CinemasController;
  let service: jest.Mocked<CinemasService>;

  const mockCinemaResponse = {
    id: 1,
    slug: 'kino-muranow',
    name: 'Kino Muranow',
    street: 'ul. Andersa 1',
    description: 'Kino artystyczne w centrum Warszawy',
    city: {
      id: 5,
      slug: 'warszawa',
      name: 'Warszawa',
      nameDeclinated: 'Warszawie',
      population: null,
      description: null,
    },
    latitude: 52.2463,
    longitude: 21.0027,
    filmwebUrl: 'https://www.filmweb.pl/cinema/kino-muranow',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CinemasController],
      providers: [
        {
          provide: CinemasService,
          useValue: {
            getCinemas: jest.fn(),
            getCinemaBySlug: jest.fn(),
            createCinemasBatch: jest.fn(),
            updateCinemaBySlug: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(CinemasController);
    service = module.get(CinemasService);
  });

  describe('getCinemas', () => {
    it('should pass query params to service', async () => {
      service.getCinemas.mockResolvedValue([mockCinemaResponse as any]);

      const query = { cityId: 5, citySlug: 'warszawa' } as any;
      const result = await controller.getCinemas(query);

      expect(service.getCinemas).toHaveBeenCalledWith(query);
      expect(result).toEqual([mockCinemaResponse]);
    });

    it('should pass empty object when no query params', async () => {
      service.getCinemas.mockResolvedValue([]);

      const query = {} as any;
      const result = await controller.getCinemas(query);

      expect(service.getCinemas).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });
  });

  describe('getCinemaBySlug', () => {
    it('should return cinema when found', async () => {
      service.getCinemaBySlug.mockResolvedValue(mockCinemaResponse);

      const result = await controller.getCinemaBySlug('kino-muranow');

      expect(service.getCinemaBySlug).toHaveBeenCalledWith('kino-muranow');
      expect(result).toEqual(mockCinemaResponse);
    });

    it('should throw NotFoundException when cinema not found', async () => {
      service.getCinemaBySlug.mockResolvedValue(null);

      await expect(controller.getCinemaBySlug('nieistniejace')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCinemasBatch', () => {
    it('should delegate dto.cinemas to service', async () => {
      const cinemas = [
        {
          sourceId: 201,
          name: 'Nowe Kino',
          slug: 'nowe-kino',
          sourceCityId: 10,
          url: 'https://filmweb.pl/cinema/nowe',
        },
      ];
      service.createCinemasBatch.mockResolvedValue(undefined);

      await controller.createCinemasBatch({ cinemas } as any);

      expect(service.createCinemasBatch).toHaveBeenCalledWith(cinemas);
    });
  });

  describe('updateCinemaBySlug', () => {
    it('should return updated cinema when found', async () => {
      service.updateCinemaBySlug.mockResolvedValue(mockCinemaResponse);

      const body = { description: 'Zaktualizowany opis' } as any;
      const result = await controller.updateCinemaBySlug('kino-muranow', body);

      expect(service.updateCinemaBySlug).toHaveBeenCalledWith(
        'kino-muranow',
        body,
      );
      expect(result).toEqual(mockCinemaResponse);
    });

    it('should throw NotFoundException when cinema not found', async () => {
      service.updateCinemaBySlug.mockResolvedValue(null);

      await expect(
        controller.updateCinemaBySlug('nieistniejace', {
          description: 'test',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
