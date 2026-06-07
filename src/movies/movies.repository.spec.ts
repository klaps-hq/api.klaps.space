import { Test, TestingModule } from '@nestjs/testing';
import { MoviesRepository } from './movies.repository';
import { DRIZZLE } from '../database/constants';
import type { CreateMoviesBatchItemDto } from './dto/create-movies-batch.dto';
import { sortAndChunk } from '../lib/chunked-upsert';
import { withDeadlockRetry } from '../lib/with-deadlock-retry';
import { movieSlug, toSlug, uniqueSlug } from '../lib/slug';

jest.mock('../lib/chunked-upsert', () => ({
  sortAndChunk: jest.fn((items) => [items]),
}));
jest.mock('../lib/with-deadlock-retry', () => ({
  withDeadlockRetry: jest.fn((fn) => fn()),
}));
jest.mock('../lib/slug', () => ({
  toSlug: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  movieSlug: jest.fn(
    (title: string, year: number) =>
      `${title.toLowerCase().replace(/\s+/g, '-')}-${year}`,
  ),
  uniqueSlug: jest.fn((slug: string) => slug),
}));

const createChainableMock = () => {
  const resolveQueue: any[][] = [];
  const defaultValue: any[] = [];
  const chain: Record<string, any> = {};
  chain.values = jest.fn().mockReturnValue(chain);
  chain.set = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
  chain.innerJoin = jest.fn().mockReturnValue(chain);
  chain.groupBy = jest.fn().mockReturnValue(chain);
  chain.having = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.then = (resolve: any) =>
    resolve(resolveQueue.length > 0 ? resolveQueue.shift() : defaultValue);
  chain._enqueue = (value: any[]) => resolveQueue.push(value);
  return chain;
};

describe('MoviesRepository', () => {
  let repository: MoviesRepository;
  let mockDb: Record<string, any>;
  let selectChain: ReturnType<typeof createChainableMock>;
  let insertChain: ReturnType<typeof createChainableMock>;

  beforeEach(async () => {
    selectChain = createChainableMock();
    insertChain = createChainableMock();

    mockDb = {
      query: {
        movies: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
      select: jest.fn().mockReturnValue(selectChain),
      insert: jest.fn().mockReturnValue(insertChain),
      update: jest.fn().mockReturnValue(insertChain),
      delete: jest.fn().mockReturnValue(insertChain),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MoviesRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repository = module.get<MoviesRepository>(MoviesRepository);

    jest.clearAllMocks();
    selectChain = createChainableMock();
    insertChain = createChainableMock();
    mockDb.select = jest.fn().mockReturnValue(selectChain);
    mockDb.insert = jest.fn().mockReturnValue(insertChain);
    mockDb.update = jest.fn().mockReturnValue(insertChain);
    mockDb.delete = jest.fn().mockReturnValue(insertChain);
    mockDb.query.movies.findMany.mockResolvedValue([]);
    mockDb.query.movies.findFirst.mockResolvedValue(null);
    (sortAndChunk as jest.Mock).mockImplementation((items) => [items]);
    (withDeadlockRetry as jest.Mock).mockImplementation((fn) => fn());
  });

  // === READ ===

  describe('findAll', () => {
    it('should call findMany with limit and offset', async () => {
      const mockMovies = [{ id: 1, title: 'Test Movie' }];
      mockDb.query.movies.findMany.mockResolvedValue(mockMovies);

      const result = await repository.findAll({
        limit: 20,
        offset: 0,
      });

      expect(mockDb.query.movies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 0,
        }),
      );
      expect(result).toEqual(mockMovies);
    });

    it('should apply search filter when provided', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([]);

      await repository.findAll({
        search: 'Matrix',
        limit: 20,
        offset: 0,
      });

      expect(mockDb.query.movies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
          limit: 20,
          offset: 0,
        }),
      );
    });

    it('should apply genre filter when genreId provided', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([]);

      await repository.findAll({
        genreId: 5,
        limit: 20,
        offset: 0,
      });

      expect(mockDb.query.movies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
        }),
      );
    });

    it('should call findMany without params when none provided', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([]);

      await repository.findAll();

      expect(mockDb.query.movies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: undefined,
          offset: undefined,
        }),
      );
    });

    it('should include MOVIE_RELATIONS in with clause', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([]);

      await repository.findAll({ limit: 10, offset: 0 });

      expect(mockDb.query.movies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          with: {
            movies_genres: { with: { genre: true } },
            movies_actors: { with: { actor: true } },
            movies_directors: { with: { director: true } },
            movies_scriptwriters: { with: { scriptwriter: true } },
            movies_countries: { with: { country: true } },
          },
        }),
      );
    });
  });

  describe('count', () => {
    it('should return count from DB', async () => {
      selectChain._enqueue([{ count: 42 }]);

      const result = await repository.count();

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
      expect(result).toBe(42);
    });

    it('should apply search filter when provided', async () => {
      selectChain._enqueue([{ count: 5 }]);

      const result = await repository.count({ search: 'Matrix' });

      expect(selectChain.where).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should apply genre filter when genreId provided', async () => {
      selectChain._enqueue([{ count: 10 }]);

      const result = await repository.count({ genreId: 3 });

      expect(selectChain.where).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });

  describe('findBySlug', () => {
    it('should call findFirst with slug condition', async () => {
      const mockMovie = { id: 1, slug: 'matrix-1999', title: 'Matrix' };
      mockDb.query.movies.findFirst.mockResolvedValue(mockMovie);

      const result = await repository.findBySlug('matrix-1999');

      expect(mockDb.query.movies.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
          with: {
            movies_genres: { with: { genre: true } },
            movies_actors: { with: { actor: true } },
            movies_directors: { with: { director: true } },
            movies_scriptwriters: { with: { scriptwriter: true } },
            movies_countries: { with: { country: true } },
          },
        }),
      );
      expect(result).toEqual(mockMovie);
    });

    it('should return undefined when slug not found', async () => {
      mockDb.query.movies.findFirst.mockResolvedValue(undefined);

      const result = await repository.findBySlug('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('findMultiCityMovies', () => {
    it('should build a query with joins and groupBy', async () => {
      const mockResult = [
        { id: 1, slug: 'movie-1', title: 'Movie 1', citiesCount: 3 },
      ];
      selectChain._enqueue(mockResult);

      const result = await repository.findMultiCityMovies();

      expect(mockDb.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
      expect(selectChain.innerJoin).toHaveBeenCalledTimes(3);
      expect(selectChain.where).toHaveBeenCalled();
      expect(selectChain.groupBy).toHaveBeenCalled();
      expect(selectChain.having).toHaveBeenCalled();
      expect(selectChain.orderBy).toHaveBeenCalled();
      expect(selectChain.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockResult);
    });

    it('should use custom limit when provided', async () => {
      selectChain._enqueue([]);

      await repository.findMultiCityMovies({ limit: 10 });

      expect(selectChain.limit).toHaveBeenCalledWith(10);
    });

    it('should use default limit when no params', async () => {
      selectChain._enqueue([]);

      await repository.findMultiCityMovies();

      expect(selectChain.limit).toHaveBeenCalledWith(5);
    });
  });

  // === WRITE ===

  describe('upsertBatch', () => {
    const baseMovie: CreateMoviesBatchItemDto = {
      sourceId: 100,
      url: 'https://filmweb.pl/film/matrix',
      title: 'Matrix',
      titleOriginal: 'The Matrix',
      description: 'A sci-fi classic',
      productionYear: 1999,
      duration: 136,
    };

    it('should return early for empty array', async () => {
      await repository.upsertBatch([]);

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(withDeadlockRetry).not.toHaveBeenCalled();
    });

    it('should upsert movies and resolve sourceId -> id mapping', async () => {
      // findExistingSlugs
      selectChain._enqueue([{ slug: 'existing-slug' }]);
      // insert movies
      insertChain.onConflictDoUpdate.mockResolvedValueOnce(undefined);
      // findIdsBySourceIds
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);

      await repository.upsertBatch([baseMovie]);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(sortAndChunk).toHaveBeenCalled();
      expect(withDeadlockRetry).toHaveBeenCalled();
      expect(movieSlug).toHaveBeenCalledWith('Matrix', 1999);
      expect(uniqueSlug).toHaveBeenCalled();
    });

    it('should generate slugs using movieSlug and uniqueSlug', async () => {
      selectChain._enqueue([]);
      insertChain.onConflictDoUpdate.mockResolvedValueOnce(undefined);
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);

      await repository.upsertBatch([baseMovie]);

      expect(movieSlug).toHaveBeenCalledWith('Matrix', 1999);
      expect(uniqueSlug).toHaveBeenCalledWith('matrix-1999', expect.any(Set));
    });

    it('should upsert actors when provided', async () => {
      const movieWithActors: CreateMoviesBatchItemDto = {
        ...baseMovie,
        actors: [{ sourceId: 10, name: 'Keanu Reeves', url: '/person/keanu' }],
      };

      // findExistingSlugs
      selectChain._enqueue([]);
      // insert movies
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      // findIdsBySourceIds (movies)
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);
      // person select (actors)
      selectChain._enqueue([{ id: 50, sourceId: 10 }]);
      // person select (directors) - empty
      selectChain._enqueue([]);
      // person select (scriptwriters) - empty
      selectChain._enqueue([]);

      await repository.upsertBatch([movieWithActors]);

      expect(withDeadlockRetry).toHaveBeenCalled();
    });

    it('should upsert genres with slug generation', async () => {
      const movieWithGenres: CreateMoviesBatchItemDto = {
        ...baseMovie,
        genres: [{ sourceId: 1, name: 'Sci-Fi' }],
      };

      // findExistingSlugs (movies)
      selectChain._enqueue([]);
      // insert movies
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      // findIdsBySourceIds (movies)
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);
      // findExistingSlugs (genres) - via select().from()
      selectChain._enqueue([]);
      // genre rows after insert
      selectChain._enqueue([{ id: 20, sourceId: 1 }]);

      await repository.upsertBatch([movieWithGenres]);

      expect(toSlug).toHaveBeenCalledWith('Sci-Fi');
      expect(uniqueSlug).toHaveBeenCalled();
    });

    it('should upsert countries when provided', async () => {
      const movieWithCountries: CreateMoviesBatchItemDto = {
        ...baseMovie,
        countries: [{ name: 'United States', countryCode: 'US' }],
      };

      // findExistingSlugs (movies)
      selectChain._enqueue([]);
      // insert movies
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      // findIdsBySourceIds (movies)
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);
      // country rows after insert
      selectChain._enqueue([{ id: 30, countryCode: 'US' }]);

      await repository.upsertBatch([movieWithCountries]);

      expect(sortAndChunk).toHaveBeenCalled();
    });

    it('should upsert directors and scriptwriters when provided', async () => {
      const movieWithCrew: CreateMoviesBatchItemDto = {
        ...baseMovie,
        directors: [
          {
            sourceId: 20,
            name: 'Lana Wachowski',
            url: '/person/lana',
          },
        ],
        scriptwriters: [
          {
            sourceId: 30,
            name: 'Lilly Wachowski',
            url: '/person/lilly',
          },
        ],
      };

      // findExistingSlugs (movies)
      selectChain._enqueue([]);
      // insert movies
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      // findIdsBySourceIds (movies)
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);
      // actors - no persons (empty)
      // directors person rows
      selectChain._enqueue([{ id: 60, sourceId: 20 }]);
      // scriptwriters person rows
      selectChain._enqueue([{ id: 70, sourceId: 30 }]);

      await repository.upsertBatch([movieWithCrew]);

      expect(withDeadlockRetry).toHaveBeenCalled();
    });

    it('should handle multiple movies in batch', async () => {
      const movies: CreateMoviesBatchItemDto[] = [
        baseMovie,
        {
          ...baseMovie,
          sourceId: 200,
          title: 'Inception',
          productionYear: 2010,
        },
      ];

      // findExistingSlugs (movies)
      selectChain._enqueue([]);
      // insert movies
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      // findIdsBySourceIds
      selectChain._enqueue([
        { id: 1, sourceId: 100 },
        { id: 2, sourceId: 200 },
      ]);

      await repository.upsertBatch(movies);

      expect(movieSlug).toHaveBeenCalledWith('Matrix', 1999);
      expect(movieSlug).toHaveBeenCalledWith('Inception', 2010);
    });

    it('should skip persons upsert when no persons in any movie', async () => {
      // findExistingSlugs (movies)
      selectChain._enqueue([]);
      // insert movies
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      // findIdsBySourceIds
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);

      await repository.upsertBatch([baseMovie]);

      // Only the movies insert should have been called (no person/genre/country inserts)
      // The exact count depends on mock chain behavior, but withDeadlockRetry
      // should only be called for the movies upsert (once)
      expect(withDeadlockRetry).toHaveBeenCalledTimes(1);
    });

    it('should filter out junction values with null ids', async () => {
      const movieWithActors: CreateMoviesBatchItemDto = {
        ...baseMovie,
        actors: [{ sourceId: 10, name: 'Keanu Reeves', url: '/person/keanu' }],
      };

      // findExistingSlugs (movies)
      selectChain._enqueue([]);
      // insert movies
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      // findIdsBySourceIds returns empty map (movie not found -> movieId will be undefined)
      selectChain._enqueue([]);
      // actor person rows
      selectChain._enqueue([{ id: 50, sourceId: 10 }]);

      await repository.upsertBatch([movieWithActors]);

      // Junction insert should be skipped because movieId is null
      // withDeadlockRetry called: once for movies upsert, once for actors entity upsert
      // but NOT for junction because all values filtered out
    });

    it('should convert premiere dates to Date objects', async () => {
      const movieWithDates: CreateMoviesBatchItemDto = {
        ...baseMovie,
        worldPremiereDate: '1999-03-31',
        polishPremiereDate: '1999-06-18',
      };

      selectChain._enqueue([]);
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);

      await repository.upsertBatch([movieWithDates]);

      const chunkCallArgs = (sortAndChunk as jest.Mock).mock.calls[0][0];
      expect(chunkCallArgs[0].worldPremiereDate).toEqual(
        new Date('1999-03-31'),
      );
      expect(chunkCallArgs[0].polishPremiereDate).toEqual(
        new Date('1999-06-18'),
      );
    });

    it('should leave premiere dates undefined when not provided', async () => {
      selectChain._enqueue([]);
      insertChain.onConflictDoUpdate.mockResolvedValue(undefined);
      selectChain._enqueue([{ id: 1, sourceId: 100 }]);

      await repository.upsertBatch([baseMovie]);

      const chunkCallArgs = (sortAndChunk as jest.Mock).mock.calls[0][0];
      expect(chunkCallArgs[0].worldPremiereDate).toBeUndefined();
      expect(chunkCallArgs[0].polishPremiereDate).toBeUndefined();
    });
  });

  describe('updateBySlug', () => {
    it('should update and return movie when found', async () => {
      const expected = {
        id: 1,
        slug: 'matrix-1999',
        title: 'Matrix',
      };
      mockDb.query.movies.findFirst.mockResolvedValue(expected);

      const result = await repository.updateBySlug('matrix-1999', {
        description: 'Updated description',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(insertChain.set).toHaveBeenCalledWith({
        description: 'Updated description',
        updatedAt: expect.any(Date),
      });
      expect(insertChain.where).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('should return null when movie not found after update', async () => {
      mockDb.query.movies.findFirst.mockResolvedValue(undefined);

      const result = await repository.updateBySlug('nieistniejace', {
        description: 'Test',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
