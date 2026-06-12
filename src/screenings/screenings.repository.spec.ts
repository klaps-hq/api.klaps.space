import { Test } from '@nestjs/testing';
import { ScreeningsRepository } from './screenings.repository';
import { DRIZZLE } from '../database/constants';

jest.mock('../lib/chunked-upsert', () => ({
  sortAndChunk: jest.fn((items) => [items]),
}));
jest.mock('../lib/with-deadlock-retry', () => ({
  withDeadlockRetry: jest.fn((fn) => fn()),
}));

const createChain = (resolvedValue: any[] = []) => {
  const chain: any = {};
  [
    'from',
    'where',
    'innerJoin',
    'leftJoin',
    'groupBy',
    'having',
    'limit',
    'orderBy',
  ].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any) => resolve(resolvedValue);
  return chain;
};

let selectDistinctChain = createChain();
let selectChain = createChain();
const mockSelectDistinct = jest.fn().mockReturnValue(selectDistinctChain);

const mockOnDuplicateKeyUpdate = jest.fn().mockReturnValue({
  returning: jest.fn().mockResolvedValue([{ id: 1 }]),
});
const mockValues = jest
  .fn()
  .mockReturnValue({ onConflictDoUpdate: mockOnDuplicateKeyUpdate });
const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

const mockSelect = jest.fn().mockReturnValue(selectChain);

const mockDb = {
  query: {
    movies: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    screenings: {
      findFirst: jest.fn(),
    },
    cinemas: {
      findFirst: jest.fn(),
    },
    cities: {
      findFirst: jest.fn(),
    },
    genres: {
      findFirst: jest.fn(),
    },
  },
  selectDistinct: mockSelectDistinct,
  select: mockSelect,
  insert: mockInsert,
};

describe('ScreeningsRepository', () => {
  let repo: ScreeningsRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ScreeningsRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repo = module.get(ScreeningsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
    selectDistinctChain = createChain();
    selectChain = createChain();
    mockSelectDistinct.mockReturnValue(selectDistinctChain);
    mockSelect.mockReturnValue(selectChain);
  });

  describe('findFilteredMovieIds', () => {
    const baseParams = {
      startDay: new Date('2025-01-01'),
      endDay: new Date('2025-01-31'),
    };

    it('should return movie ids from selectDistinct', async () => {
      selectDistinctChain = createChain([{ movieId: 10 }, { movieId: 20 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds(baseParams);

      expect(result).toEqual([10, 20]);
      expect(mockSelectDistinct).toHaveBeenCalled();
      expect(selectDistinctChain.from).toHaveBeenCalled();
      expect(selectDistinctChain.innerJoin).toHaveBeenCalled();
      expect(selectDistinctChain.leftJoin).toHaveBeenCalled();
    });

    it('should return empty array when no screenings match', async () => {
      const result = await repo.findFilteredMovieIds(baseParams);

      expect(result).toEqual([]);
    });

    it('should resolve cinema location when cinemaSlug provided', async () => {
      mockDb.query.cinemas.findFirst.mockResolvedValueOnce({
        sourceId: 'cinema-1',
      });
      selectDistinctChain = createChain([{ movieId: 5 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        cinemaSlug: 'kino-atlantic',
      });

      expect(result).toEqual([5]);
      expect(mockDb.query.cinemas.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
        columns: { sourceId: true },
      });
    });

    it('should resolve city location when citySlug provided', async () => {
      mockDb.query.cities.findFirst.mockResolvedValueOnce({
        sourceId: 'city-1',
      });
      selectDistinctChain = createChain([{ movieId: 7 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        citySlug: 'warszawa',
      });

      expect(result).toEqual([7]);
      expect(mockDb.query.cities.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
        columns: { sourceId: true },
      });
    });

    it('should resolve city location when cityId provided', async () => {
      mockDb.query.cities.findFirst.mockResolvedValueOnce({
        sourceId: 'city-2',
      });
      selectDistinctChain = createChain([{ movieId: 8 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        cityId: 3,
      });

      expect(result).toEqual([8]);
      expect(mockDb.query.cities.findFirst).toHaveBeenCalled();
    });

    it('should resolve voivodeship location when voivodeship provided', async () => {
      selectDistinctChain = createChain([{ movieId: 9 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        voivodeship: 'mazowieckie',
      });

      expect(result).toEqual([9]);
      // Cinema subquery by voivodeship: select → innerJoin(cities) → where
      expect(mockSelect).toHaveBeenCalled();
      expect(selectChain.innerJoin).toHaveBeenCalled();
      expect(selectChain.where).toHaveBeenCalled();
    });

    it('should prefer city over voivodeship when both provided', async () => {
      mockDb.query.cities.findFirst.mockResolvedValueOnce({
        sourceId: 'city-3',
      });
      selectDistinctChain = createChain([{ movieId: 11 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        cityId: 3,
        voivodeship: 'mazowieckie',
      });

      expect(result).toEqual([11]);
      expect(mockDb.query.cities.findFirst).toHaveBeenCalled();
      // City condition wins - the voivodeship subquery (with innerJoin) is never built
      expect(selectChain.innerJoin).not.toHaveBeenCalled();
    });

    it('should return undefined location when cinema not found', async () => {
      mockDb.query.cinemas.findFirst.mockResolvedValueOnce(undefined);
      selectDistinctChain = createChain([{ movieId: 1 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        cinemaSlug: 'nonexistent',
      });

      expect(result).toEqual([1]);
    });

    it('should return undefined location when city not found', async () => {
      mockDb.query.cities.findFirst.mockResolvedValueOnce(undefined);
      selectDistinctChain = createChain([{ movieId: 2 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        citySlug: 'nonexistent',
      });

      expect(result).toEqual([2]);
    });

    it('should resolve genre condition when genreId provided', async () => {
      selectDistinctChain = createChain([{ movieId: 15 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        genreId: 4,
      });

      expect(result).toEqual([15]);
    });

    it('should resolve genre condition when genreSlug provided', async () => {
      mockDb.query.genres.findFirst.mockResolvedValueOnce({ id: 7 });
      selectDistinctChain = createChain([{ movieId: 22 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        genreSlug: 'dramat',
      });

      expect(result).toEqual([22]);
      expect(mockDb.query.genres.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
        columns: { id: true },
      });
    });

    it('should return undefined genre condition when genre not found', async () => {
      mockDb.query.genres.findFirst.mockResolvedValueOnce(undefined);
      selectDistinctChain = createChain([{ movieId: 3 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        genreSlug: 'nonexistent',
      });

      expect(result).toEqual([3]);
    });

    it('should resolve director condition when directorId provided', async () => {
      selectDistinctChain = createChain([{ movieId: 30 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findFilteredMovieIds({
        ...baseParams,
        directorId: 12,
      });

      expect(result).toEqual([30]);
      // Director subquery is built via the plain select() builder.
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe('findMoviesWithScreenings', () => {
    it('should call query.movies.findMany with movieIds and date range', async () => {
      const movies = [
        { id: 10, title: 'Film A', screenings: [] },
        { id: 20, title: 'Film B', screenings: [] },
      ];
      mockDb.query.movies.findMany.mockResolvedValue(movies);

      const result = await repo.findMoviesWithScreenings(
        [10, 20],
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result).toEqual(movies);
      expect(mockDb.query.movies.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
        with: expect.objectContaining({
          movies_genres: { with: { genre: true } },
          screenings: expect.objectContaining({
            with: { cinema: { with: { city: true } } },
            where: expect.anything(),
          }),
        }),
      });
    });

    it('should resolve location filter when provided with cinemaSlug', async () => {
      mockDb.query.cinemas.findFirst.mockResolvedValueOnce({
        sourceId: 'c-1',
      });
      mockDb.query.movies.findMany.mockResolvedValue([]);

      await repo.findMoviesWithScreenings(
        [10],
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        { cinemaSlug: 'kino-test' },
      );

      expect(mockDb.query.cinemas.findFirst).toHaveBeenCalled();
      expect(mockDb.query.movies.findMany).toHaveBeenCalled();
    });

    it('should not resolve location when no filter provided', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([]);

      await repo.findMoviesWithScreenings(
        [10],
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(mockDb.query.cinemas.findFirst).not.toHaveBeenCalled();
      expect(mockDb.query.cities.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findRetroMovieIds', () => {
    it('should return movie ids from query with year threshold', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([
        { id: 100 },
        { id: 200 },
      ]);

      const result = await repo.findRetroMovieIds(2000);

      expect(result).toEqual([100, 200]);
      expect(mockDb.query.movies.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
        columns: { id: true },
      });
    });

    it('should return empty array when no retro movies found', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([]);

      const result = await repo.findRetroMovieIds(1950);

      expect(result).toEqual([]);
    });
  });

  describe('findCandidateRetroMovieIds', () => {
    it('should return distinct movieIds with date range and retroMovieIds filter', async () => {
      selectDistinctChain = createChain([{ movieId: 100 }, { movieId: 300 }]);
      mockSelectDistinct.mockReturnValue(selectDistinctChain);

      const result = await repo.findCandidateRetroMovieIds(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        [100, 200, 300],
      );

      expect(result).toEqual([100, 300]);
      expect(mockSelectDistinct).toHaveBeenCalled();
    });

    it('should return empty array when no candidates found', async () => {
      const result = await repo.findCandidateRetroMovieIds(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        [100],
      );

      expect(result).toEqual([]);
    });
  });

  describe('findMovieWithScreeningsById', () => {
    it('should call query.movies.findFirst with movieId and date range', async () => {
      const movie = {
        id: 42,
        title: 'Blade Runner',
        screenings: [{ id: 1 }],
      };
      mockDb.query.movies.findFirst.mockResolvedValue(movie);

      const result = await repo.findMovieWithScreeningsById(
        42,
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result).toEqual(movie);
      expect(mockDb.query.movies.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
        with: {
          movies_genres: { with: { genre: true } },
          movies_directors: { with: { director: true } },
          screenings: {
            where: expect.anything(),
            with: { cinema: { with: { city: true } } },
          },
        },
      });
    });

    it('should return undefined when movie not found', async () => {
      mockDb.query.movies.findFirst.mockResolvedValue(undefined);

      const result = await repo.findMovieWithScreeningsById(
        999,
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result).toBeUndefined();
    });
  });

  describe('findLastUpdatedAt', () => {
    it('should return newest updatedAt without a location filter', async () => {
      const updatedAt = new Date('2026-06-07T10:00:00.000Z');
      selectChain = createChain([{ updatedAt }]);
      mockSelect.mockReturnValue(selectChain);

      const result = await repo.findLastUpdatedAt();

      expect(result).toEqual(updatedAt);
      expect(mockSelect).toHaveBeenCalled();
    });

    it('should return null when no screening matches', async () => {
      selectChain = createChain([{ updatedAt: null }]);
      mockSelect.mockReturnValue(selectChain);

      const result = await repo.findLastUpdatedAt({ citySlug: 'nowhere' });

      expect(result).toBeNull();
    });

    it('should filter by directorId when provided', async () => {
      const updatedAt = new Date('2026-06-07T10:00:00.000Z');
      selectChain = createChain([{ updatedAt }]);
      mockSelect.mockReturnValue(selectChain);

      const result = await repo.findLastUpdatedAt({ directorId: 12 });

      expect(result).toEqual(updatedAt);
      expect(mockSelect).toHaveBeenCalled();
    });
  });

  describe('insert', () => {
    const dto = {
      url: 'https://kino.pl/tickets/99',
      movieId: 42,
      showtimeId: 99,
      cinemaId: 5,
      type: '2D',
      date: '2025-01-20',
      isDubbing: false,
      isSubtitled: true,
    };

    it('should insert screening and return fetched result', async () => {
      const screening = {
        id: 1,
        ...dto,
        date: new Date(dto.date),
        createdAt: new Date(),
      };
      mockDb.query.screenings.findFirst.mockResolvedValue(screening);

      const result = await repo.insert(dto);

      expect(result).toEqual(screening);
      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        ...dto,
        date: new Date(dto.date),
      });
      expect(mockOnDuplicateKeyUpdate).toHaveBeenCalledWith({
        target: expect.anything(),
        set: {
          url: dto.url,
          movieId: dto.movieId,
          showtimeId: dto.showtimeId,
          cinemaId: dto.cinemaId,
          type: dto.type,
          date: new Date(dto.date),
          isDubbing: dto.isDubbing,
          isSubtitled: dto.isSubtitled,
        },
      });
      expect(mockDb.query.screenings.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });
  });
});
