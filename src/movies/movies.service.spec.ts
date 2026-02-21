import { Test } from '@nestjs/testing';
import { MoviesService } from './movies.service';
import { DRIZZLE } from '../database/constants';

describe('MoviesService', () => {
  let service: MoviesService;
  let mockDb: any;

  const sampleMovie = {
    id: 1,
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
    movies_genres: [{ genre: { id: 1, name: 'Drama' } }],
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

  describe('getMovieById', () => {
    it('returns full movie detail when found', async () => {
      mockDb.query.movies.findFirst.mockResolvedValue(sampleMovie);

      const result = await service.getMovieById(1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.genres).toEqual([{ id: 1, name: 'Drama' }]);
      expect(result!.actors).toEqual([{ id: 10, name: 'Actor' }]);
    });

    it('returns null when movie not found', async () => {
      mockDb.query.movies.findFirst.mockResolvedValue(undefined);

      const result = await service.getMovieById(999);

      expect(result).toBeNull();
    });
  });
});
