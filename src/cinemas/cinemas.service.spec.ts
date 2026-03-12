import { Test } from '@nestjs/testing';
import { CinemasService } from './cinemas.service';
import { CinemasRepository } from './cinemas.repository';
import { CitiesService } from '../cities/cities.service';

describe('CinemasService', () => {
  let service: CinemasService;
  let repo: jest.Mocked<CinemasRepository>;
  let citiesService: jest.Mocked<CitiesService>;

  const mockCinema = {
    id: 1,
    sourceId: 101,
    slug: 'kino-muranow',
    name: 'Kino Muranow',
    street: 'ul. Andersa 1',
    description: 'Kino artystyczne w centrum Warszawy',
    sourceCityId: 10,
    url: 'https://www.filmweb.pl/cinema/kino-muranow',
    latitude: 52.2463,
    longitude: 21.0027,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockCinemaWithCity = {
    ...mockCinema,
    city: {
      id: 5,
      slug: 'warszawa',
      name: 'Warszawa',
      nameDeclinated: 'Warszawie',
      description: null,
    },
  };

  const mockCity = {
    id: 5,
    sourceId: 10,
    slug: 'warszawa',
    name: 'Warszawa',
    nameDeclinated: 'Warszawie',
    areacode: null,
    description: null,
    lastScrapedAt: null,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CinemasService,
        {
          provide: CinemasRepository,
          useValue: {
            findAll: jest.fn(),
            findBySlug: jest.fn(),
            upsertBatch: jest.fn(),
            updateBySlug: jest.fn(),
          },
        },
        {
          provide: CitiesService,
          useValue: {
            findBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CinemasService);
    repo = module.get(CinemasRepository);
    citiesService = module.get(CitiesService);
  });

  const mockCinemaSummaryResponse = {
    id: 1,
    slug: 'kino-muranow',
    name: 'Kino Muranow',
    street: 'ul. Andersa 1',
    city: {
      id: 5,
      slug: 'warszawa',
      name: 'Warszawa',
      nameDeclinated: 'Warszawie',
      description: null,
    },
  };

  describe('getCinemas', () => {
    it('should return mapped cinema summaries', async () => {
      repo.findAll.mockResolvedValue([mockCinemaWithCity as any]);

      const result = await service.getCinemas({});

      expect(repo.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([mockCinemaSummaryResponse]);
    });

    it('should resolve sourceCityId via citiesService when citySlug provided', async () => {
      citiesService.findBySlug.mockResolvedValue(mockCity);
      repo.findAll.mockResolvedValue([mockCinemaWithCity as any]);

      const result = await service.getCinemas({ citySlug: 'warszawa' });

      expect(citiesService.findBySlug).toHaveBeenCalledWith('warszawa');
      expect(repo.findAll).toHaveBeenCalledWith(10);
      expect(result).toEqual([mockCinemaSummaryResponse]);
    });

    it('should pass undefined sourceCityId when city not found by slug', async () => {
      citiesService.findBySlug.mockResolvedValue(null);
      repo.findAll.mockResolvedValue([]);

      const result = await service.getCinemas({ citySlug: 'nieistniejace' });

      expect(citiesService.findBySlug).toHaveBeenCalledWith('nieistniejace');
      expect(repo.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('getCinemaBySlug', () => {
    it('should return mapped cinema when found', async () => {
      repo.findBySlug.mockResolvedValue(mockCinemaWithCity as any);

      const result = await service.getCinemaBySlug('kino-muranow');

      expect(repo.findBySlug).toHaveBeenCalledWith('kino-muranow');
      expect(result).toEqual({
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
          description: null,
        },
        latitude: 52.2463,
        longitude: 21.0027,
        filmwebUrl: 'https://www.filmweb.pl/cinema/kino-muranow',
      });
    });

    it('should return null when cinema not found', async () => {
      repo.findBySlug.mockResolvedValue(undefined);

      const result = await service.getCinemaBySlug('nieistniejace');

      expect(result).toBeNull();
    });
  });

  describe('createCinemasBatch', () => {
    it('should delegate to repo.upsertBatch', async () => {
      const cinemas = [
        {
          sourceId: 201,
          name: 'Nowe Kino',
          slug: 'nowe-kino',
          sourceCityId: 10,
          url: 'https://filmweb.pl/cinema/nowe',
        },
      ];
      repo.upsertBatch.mockResolvedValue(undefined);

      await service.createCinemasBatch(cinemas as any);

      expect(repo.upsertBatch).toHaveBeenCalledWith(cinemas);
    });
  });

  describe('updateCinemaBySlug', () => {
    it('should return mapped cinema response after update', async () => {
      repo.updateBySlug.mockResolvedValue(mockCinemaWithCity as any);

      const result = await service.updateCinemaBySlug('kino-muranow', {
        description: 'Updated',
      } as any);

      expect(repo.updateBySlug).toHaveBeenCalledWith('kino-muranow', {
        description: 'Updated',
      });
      expect(result).toEqual({
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
          description: null,
        },
        latitude: 52.2463,
        longitude: 21.0027,
        filmwebUrl: 'https://www.filmweb.pl/cinema/kino-muranow',
      });
    });

    it('should return null when cinema not found', async () => {
      repo.updateBySlug.mockResolvedValue(null);

      const result = await service.updateCinemaBySlug('nieistniejace', {
        description: 'Updated',
      } as any);

      expect(result).toBeNull();
    });
  });
});
