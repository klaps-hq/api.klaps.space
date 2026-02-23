import { Test } from '@nestjs/testing';
import { MoviesService } from './movies.service';
import { DRIZZLE } from '../database/constants';

describe('MoviesService', () => {
  let service: MoviesService;
  let mockDb: any;

  const sampleMovie = {
    id: 1,
    slug: 'test-movie-2024',
    title: 'Test Movie',
    titleOriginal: 'Original',
    description: 'Desc',
    productionYear: 2024,
    duration: 120,
    language: 'pl',
    posterUrl: 'https://img/poster.jpg',
    backdropUrl: 'https://img/backdrop.jpg',
    videoUrl: null,
    url: 'https://filmweb.pl/1',
    worldPremiereDate: new Date('2024-01-01'),
    polishPremiereDate: new Date('2024-02-01'),
    usersRating: 7.0,
    usersRatingVotes: 500,
    criticsRating: 6.0,
    criticsRatingVotes: 20,
    sourceId: 100,
    movies_genres: [{ genre: { id: 1, slug: 'drama', name: 'Drama' } }],
    movies_actors: [{ actor: { id: 10, name: 'Actor' } }],
    movies_directors: [{ director: { id: 20, name: 'Director' } }],
    movies_scriptwriters: [{ scriptwriter: { id: 30, name: 'Writer' } }],
    movies_countries: [{ country: { id: 40, name: 'Poland' } }],
  };

  beforeEach(async () => {
    const mockInsertChain = {
      values: jest.fn().mockReturnThis(),
      onDuplicateKeyUpdate: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      query: {
        movies: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
        actors: { findFirst: jest.fn() },
        directors: { findFirst: jest.fn() },
        scriptwriters: { findFirst: jest.fn() },
        countries: { findFirst: jest.fn() },
        genres: { findFirst: jest.fn() },
      },
      insert: jest.fn().mockReturnValue(mockInsertChain),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 1 }]),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [MoviesService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get(MoviesService);
  });

  describe('getMovies', () => {
    it('returns paginated movies with meta', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 1 }]),
        }),
      });
      mockDb.query.movies.findMany.mockResolvedValue([sampleMovie]);

      const result = await service.getMovies({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('uses default page and limit', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 0 }]),
        }),
      });
      mockDb.query.movies.findMany.mockResolvedValue([]);

      const result = await service.getMovies();

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('getMultiCityMovies', () => {
    it('returns movies from chain', async () => {
      const expected = [
        {
          id: 1,
          title: 'Film',
          productionYear: 2024,
          posterUrl: null,
          description: 'Desc',
          duration: 120,
          citiesCount: 3,
        },
      ];
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(expected),
      };
      mockDb.select.mockReturnValue(mockChain);

      const result = await service.getMultiCityMovies({ limit: 5 });

      expect(result).toEqual(expected);
    });

    it('uses default limit when none provided', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockChain);

      const result = await service.getMultiCityMovies();

      expect(result).toEqual([]);
      expect(mockChain.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('createMovie', () => {
    it('upserts movie and related entities', async () => {
      const dto = {
        sourceId: 100,
        title: 'Test',
        titleOriginal: 'Original',
        description: 'Desc',
        productionYear: 2024,
        duration: 120,
        language: 'pl',
        posterUrl: null,
        backdropUrl: null,
        videoUrl: null,
        url: 'https://filmweb.pl/1',
        worldPremiereDate: '2024-01-01',
        polishPremiereDate: '2024-02-01',
        usersRating: 7.0,
        usersRatingVotes: 500,
        criticsRating: 6.0,
        criticsRatingVotes: 20,
        boxoffice: null,
        budget: null,
        distribution: null,
        actors: [{ sourceId: 1, name: 'Actor A', url: 'http://a' }],
        directors: [{ sourceId: 2, name: 'Director A', url: 'http://d' }],
        scriptwriters: [{ sourceId: 3, name: 'Writer A', url: 'http://s' }],
        countries: [{ name: 'Poland', countryCode: 'PL' }],
        genres: [{ sourceId: 10, name: 'Drama' }],
      };

      mockDb.query.movies.findFirst.mockResolvedValue({ id: 1, ...dto });
      mockDb.query.actors.findFirst.mockResolvedValue({ id: 10 });
      mockDb.query.directors.findFirst.mockResolvedValue({ id: 20 });
      mockDb.query.scriptwriters.findFirst.mockResolvedValue({ id: 30 });
      mockDb.query.countries.findFirst.mockResolvedValue({ id: 40 });
      mockDb.query.genres.findFirst.mockResolvedValue({ id: 50 });

      const result = await service.createMovie(dto as any);

      expect(result.id).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('handles movie with no related entities', async () => {
      const dto = {
        sourceId: 100,
        title: 'Minimal',
        titleOriginal: '',
        description: '',
        productionYear: 2024,
        duration: 90,
        language: null,
        posterUrl: null,
        backdropUrl: null,
        videoUrl: null,
        url: 'https://filmweb.pl/2',
        worldPremiereDate: null,
        polishPremiereDate: null,
        usersRating: null,
        usersRatingVotes: null,
        criticsRating: null,
        criticsRatingVotes: null,
        boxoffice: null,
        budget: null,
        distribution: null,
      };

      mockDb.query.movies.findFirst.mockResolvedValue({ id: 2, ...dto });

      const result = await service.createMovie(dto as any);

      expect(result.id).toBe(2);
    });

    it('skips junction insert when entity lookup returns null', async () => {
      const dto = {
        sourceId: 100,
        title: 'Test',
        titleOriginal: '',
        description: '',
        productionYear: 2024,
        duration: 90,
        language: null,
        posterUrl: null,
        backdropUrl: null,
        videoUrl: null,
        url: 'https://filmweb.pl/3',
        actors: [{ sourceId: 999, name: 'Ghost', url: '' }],
        directors: [{ sourceId: 998, name: 'Ghost', url: '' }],
        scriptwriters: [{ sourceId: 997, name: 'Ghost', url: '' }],
        countries: [{ name: 'Unknown', countryCode: 'XX' }],
        genres: [{ sourceId: 996, name: 'Unknown' }],
      };

      mockDb.query.movies.findFirst.mockResolvedValue({ id: 3, ...dto });
      mockDb.query.actors.findFirst.mockResolvedValue(undefined);
      mockDb.query.directors.findFirst.mockResolvedValue(undefined);
      mockDb.query.scriptwriters.findFirst.mockResolvedValue(undefined);
      mockDb.query.countries.findFirst.mockResolvedValue(undefined);
      mockDb.query.genres.findFirst.mockResolvedValue(undefined);

      const result = await service.createMovie(dto as any);

      expect(result.id).toBe(3);
    });
  });

  describe('getMovieByIdOrSlug', () => {
    it('returns full movie detail when found by id', async () => {
      mockDb.query.movies.findFirst.mockResolvedValue(sampleMovie);

      const result = await service.getMovieByIdOrSlug('1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.genres).toEqual([{ id: 1, slug: 'drama', name: 'Drama' }]);
      expect(result!.actors).toEqual([{ id: 10, name: 'Actor' }]);
    });

    it('returns full movie detail when found by slug', async () => {
      mockDb.query.movies.findFirst.mockResolvedValue(sampleMovie);

      const result = await service.getMovieByIdOrSlug('test-movie-2024');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('test-movie-2024');
    });

    it('returns null when movie not found', async () => {
      mockDb.query.movies.findFirst.mockResolvedValue(undefined);

      const result = await service.getMovieByIdOrSlug('999');

      expect(result).toBeNull();
    });
  });
});
