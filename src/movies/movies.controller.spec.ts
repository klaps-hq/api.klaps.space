import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import type { MovieResponse, MultiCityMovieResponse } from './movies.types';

const mockPaginatedMovies = {
  data: [
    {
      id: 1,
      sourceId: 100,
      slug: 'inception-2010',
      url: 'https://filmweb.pl/inception',
      title: 'Inception',
      titleOriginal: 'Inception',
      description: 'A mind-bending thriller',
      productionYear: 2010,
      duration: 148,
      posterUrl: 'https://example.com/poster.jpg',
      videoUrl: null,
      genres: [{ id: 1, slug: 'action', name: 'Action', description: null }],
    },
  ],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

const mockMovieDetail: MovieResponse = {
  id: 1,
  slug: 'inception-2010',
  title: 'Inception',
  titleOriginal: 'Inception',
  description: 'A mind-bending thriller',
  productionYear: 2010,
  duration: 148,
  language: 'English',
  posterUrl: 'https://example.com/poster.jpg',
  backdropUrl: null,
  videoUrl: null,
  worldPremiereDate: '2010-07-16',
  polishPremiereDate: '2010-07-30',
  genres: [{ id: 1, slug: 'action', name: 'Action', description: null }],
  actors: [{ id: 1, name: 'Leonardo DiCaprio' }],
  directors: [{ id: 1, slug: 'christopher-nolan', name: 'Christopher Nolan' }],
  scriptwriters: [{ id: 1, name: 'Christopher Nolan' }],
  countries: [{ id: 1, name: 'USA' }],
  ratings: {
    users: { score: 8.2, votes: 50000 },
    critics: { score: 8.8, votes: 300 },
  },
  filmwebUrl: 'https://filmweb.pl/inception',
};

const mockMultiCityMovies: MultiCityMovieResponse[] = [
  {
    id: 1,
    slug: 'inception-2010',
    title: 'Inception',
    productionYear: 2010,
    posterUrl: 'https://example.com/poster.jpg',
    citiesCount: 3,
    description: 'A mind-bending thriller',
    duration: 148,
  },
];

describe('MoviesController', () => {
  let controller: MoviesController;
  let service: jest.Mocked<MoviesService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        {
          provide: MoviesService,
          useValue: {
            getMovies: jest.fn(),
            getMovieBySlug: jest.fn(),
            getMultiCityMovies: jest.fn(),
            createMoviesBatch: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(MoviesController);
    service = module.get(MoviesService);
  });

  describe('getMovies', () => {
    it('should delegate to service with query params', async () => {
      service.getMovies.mockResolvedValue(mockPaginatedMovies);

      const query = { page: 1, limit: 20 } as any;
      const result = await controller.getMovies(query);

      expect(result).toEqual(mockPaginatedMovies);
      expect(service.getMovies).toHaveBeenCalledWith(query);
    });
  });

  describe('createMoviesBatch', () => {
    it('should delegate to service with dto.movies', async () => {
      service.createMoviesBatch.mockResolvedValue(undefined);

      const movies = [{ sourceId: 1, title: 'Test' }];
      await controller.createMoviesBatch({ movies } as any);

      expect(service.createMoviesBatch).toHaveBeenCalledWith(movies);
    });
  });

  describe('getMultiCityMovies', () => {
    it('should delegate to service', async () => {
      service.getMultiCityMovies.mockResolvedValue(mockMultiCityMovies);

      const query = { limit: 5 } as any;
      const result = await controller.getMultiCityMovies(query);

      expect(result).toEqual(mockMultiCityMovies);
      expect(service.getMultiCityMovies).toHaveBeenCalledWith(query);
    });
  });

  describe('getMovieBySlug', () => {
    it('should return movie when found', async () => {
      service.getMovieBySlug.mockResolvedValue(mockMovieDetail);

      const result = await controller.getMovieBySlug('inception-2010');

      expect(result).toEqual(mockMovieDetail);
      expect(service.getMovieBySlug).toHaveBeenCalledWith('inception-2010');
    });

    it('should throw NotFoundException when movie not found', async () => {
      service.getMovieBySlug.mockResolvedValue(null);

      await expect(controller.getMovieBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getMovieBySlug('nonexistent')).rejects.toThrow(
        'Movie "nonexistent" not found',
      );
    });
  });
});
