import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

describe('MoviesController', () => {
  let controller: MoviesController;
  let service: jest.Mocked<MoviesService>;

  beforeEach(async () => {
    const mockService = {
      getMovies: jest.fn(),
      createMovie: jest.fn(),
      getMultiCityMovies: jest.fn(),
      getMovieById: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        { provide: MoviesService, useValue: mockService },
        { provide: CACHE_MANAGER, useValue: { get: jest.fn(), set: jest.fn() } },
      ],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MoviesController);
    service = module.get(MoviesService) as jest.Mocked<MoviesService>;
  });

  describe('getMovies', () => {
    it('delegates to service with query params', async () => {
      const expected = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      service.getMovies.mockResolvedValue(expected);

      const result = await controller.getMovies({
        search: 'test',
        genreId: 1,
        page: 2,
        limit: 10,
      });

      expect(result).toEqual(expected);
      expect(service.getMovies).toHaveBeenCalledWith({
        search: 'test',
        genreId: 1,
        page: 2,
        limit: 10,
      });
    });
  });

  describe('createMovie', () => {
    it('delegates to service', async () => {
      const dto = { sourceId: 1, title: 'Film' } as any;
      const movie = { id: 1, ...dto };
      service.createMovie.mockResolvedValue(movie);

      const result = await controller.createMovie(dto);

      expect(result).toEqual(movie);
    });
  });

  describe('getMultiCityMovies', () => {
    it('delegates to service with limit', async () => {
      const expected = [
        { id: 1, title: 'Film', citiesCount: 3 },
      ] as any;
      service.getMultiCityMovies.mockResolvedValue(expected);

      const result = await controller.getMultiCityMovies({ limit: 5 });

      expect(result).toEqual(expected);
      expect(service.getMultiCityMovies).toHaveBeenCalledWith({ limit: 5 });
    });
  });

  describe('getMovieById', () => {
    it('returns movie when found', async () => {
      const movie = { id: 1, title: 'Film' } as any;
      service.getMovieById.mockResolvedValue(movie);

      const result = await controller.getMovieById(1);

      expect(result).toEqual(movie);
    });

    it('throws NotFoundException when not found', async () => {
      service.getMovieById.mockResolvedValue(null);

      await expect(controller.getMovieById(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
