import { Test } from '@nestjs/testing';
import { MoviesService } from './movies.service';
import { MoviesRepository } from './movies.repository';
import { GenresService } from '../genres/genres.service';

const mockGenre = { id: 1, slug: 'action', name: 'Action' };

const mockDbMovie = {
  id: 1,
  sourceId: 100,
  slug: 'inception-2010',
  title: 'Inception',
  titleOriginal: 'Inception',
  description: 'A mind-bending thriller',
  productionYear: 2010,
  duration: 148,
  language: 'English',
  posterUrl: 'https://example.com/poster.jpg',
  backdropUrl: 'https://example.com/backdrop.jpg',
  videoUrl: 'https://example.com/trailer.mp4',
  url: 'https://filmweb.pl/inception',
  worldPremiereDate: new Date('2010-07-16'),
  polishPremiereDate: new Date('2010-07-30'),
  usersRating: 8.2,
  usersRatingVotes: 50000,
  criticsRating: 8.8,
  criticsRatingVotes: 300,
  boxoffice: null,
  budget: null,
  distribution: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  movies_genres: [{ genre: { id: 1, slug: 'action', name: 'Action' } }],
  movies_actors: [{ actor: { id: 1, name: 'Leonardo DiCaprio' } }],
  movies_directors: [{ director: { id: 1, name: 'Christopher Nolan' } }],
  movies_scriptwriters: [
    { scriptwriter: { id: 1, name: 'Christopher Nolan' } },
  ],
  movies_countries: [{ country: { id: 1, name: 'USA' } }],
};

const mockMultiCityMovie = {
  id: 1,
  slug: 'inception-2010',
  title: 'Inception',
  productionYear: 2010,
  posterUrl: 'https://example.com/poster.jpg',
  citiesCount: 3,
  description: 'A mind-bending thriller',
  duration: 148,
};

describe('MoviesService', () => {
  let service: MoviesService;
  let repo: jest.Mocked<MoviesRepository>;
  let genresService: jest.Mocked<GenresService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MoviesService,
        {
          provide: MoviesRepository,
          useValue: {
            findAll: jest.fn(),
            count: jest.fn(),
            findBySlug: jest.fn(),
            findMultiCityMovies: jest.fn(),
            upsertBatch: jest.fn(),
          },
        },
        {
          provide: GenresService,
          useValue: {
            findBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MoviesService);
    repo = module.get(MoviesRepository);
    genresService = module.get(GenresService);
  });

  describe('getMovies', () => {
    it('should return paginated movies', async () => {
      repo.findAll.mockResolvedValue([mockDbMovie] as any);
      repo.count.mockResolvedValue(1);

      const result = await service.getMovies({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].slug).toBe('inception-2010');
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 0 }),
      );
      expect(repo.count).toHaveBeenCalled();
    });

    it('should use default pagination when no params', async () => {
      repo.findAll.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.getMovies();

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
    });

    it('should resolve genreSlug via genresService', async () => {
      genresService.findBySlug.mockResolvedValue(mockGenre as any);
      repo.findAll.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.getMovies({ genreSlug: 'action' });

      expect(genresService.findBySlug).toHaveBeenCalledWith('action');
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ genreId: 1 }),
      );
    });

    it('should not resolve genreSlug when genreId is provided', async () => {
      repo.findAll.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.getMovies({ genreId: 5, genreSlug: 'action' });

      expect(genresService.findBySlug).not.toHaveBeenCalled();
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ genreId: 5 }),
      );
    });
  });

  describe('getMovieBySlug', () => {
    it('should return mapped movie detail', async () => {
      repo.findBySlug.mockResolvedValue(mockDbMovie as any);

      const result = await service.getMovieBySlug('inception-2010');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('inception-2010');
      expect(result!.filmwebUrl).toBe('https://filmweb.pl/inception');
      expect(repo.findBySlug).toHaveBeenCalledWith('inception-2010');
    });

    it('should return null when movie not found', async () => {
      repo.findBySlug.mockResolvedValue(undefined);

      const result = await service.getMovieBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getMultiCityMovies', () => {
    it('should delegate to repo', async () => {
      repo.findMultiCityMovies.mockResolvedValue([mockMultiCityMovie]);

      const result = await service.getMultiCityMovies({ limit: 5 });

      expect(result).toEqual([mockMultiCityMovie]);
      expect(repo.findMultiCityMovies).toHaveBeenCalledWith({ limit: 5 });
    });
  });

  describe('createMoviesBatch', () => {
    it('should delegate to repo', async () => {
      repo.upsertBatch.mockResolvedValue(undefined);

      const movies = [{ sourceId: 1, title: 'Test' }] as any;
      await service.createMoviesBatch(movies);

      expect(repo.upsertBatch).toHaveBeenCalledWith(movies);
    });
  });
});
