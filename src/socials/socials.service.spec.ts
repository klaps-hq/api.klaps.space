import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SocialsService } from './socials.service';
import { SocialsRepository } from './socials.repository';
import type { ScreeningWithCinemaCity } from './socials.types';

jest.mock('../lib/date', () => ({
  getDate: jest.fn((d: string) => d),
  getDatePlusDays: jest.fn((d: string, n: number) => `${d}+${n}`),
  getTodayInPoland: jest.fn(() => '2025-03-11'),
  toDateOnlyString: jest.fn((d: Date) => d.toISOString().slice(0, 10)),
}));

const makeMovie = (
  overrides: Partial<{
    id: number;
    productionYear: number;
    movies_genres: { id: number; genreId: number }[];
    backdropUrl: string | null;
    usersRating: number | null;
    usersRatingVotes: number | null;
    criticsRating: number | null;
    criticsRatingVotes: number | null;
  }> = {},
) => ({
  id: overrides.id ?? 1,
  sourceId: 100,
  slug: 'test-movie',
  title: 'Test Movie',
  titleOriginal: 'Test Movie Original',
  description: 'A test movie',
  productionYear: overrides.productionYear ?? 2020,
  duration: 120,
  language: 'pl',
  posterUrl: null,
  backdropUrl:
    overrides.backdropUrl === undefined
      ? 'https://example.com/backdrop.jpg'
      : overrides.backdropUrl,
  videoUrl: null,
  url: 'https://example.com/movie',
  worldPremiereDate: null,
  polishPremiereDate: null,
  usersRating: overrides.usersRating ?? null,
  usersRatingVotes: overrides.usersRatingVotes ?? null,
  criticsRating: overrides.criticsRating ?? null,
  criticsRatingVotes: overrides.criticsRatingVotes ?? null,
  boxoffice: null,
  budget: null,
  distribution: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  movies_genres: overrides.movies_genres ?? [],
});

const makeScreening = (
  overrides: Partial<{
    id: number;
    movieId: number;
    movie: ReturnType<typeof makeMovie>;
    cinema: { city?: { id: number } } | null;
  }>,
): ScreeningWithCinemaCity => ({
  id: overrides.id ?? 1,
  movieId: overrides.movieId ?? 1,
  cinemaId: 10,
  showtimeId: 100,
  date: new Date('2025-03-15'),
  url: 'https://example.com/screening',
  type: 'regular',
  isDubbing: false,
  isSubtitled: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  movie: overrides.movie ?? makeMovie(),
  cinema: overrides.cinema ?? { city: { id: 1 } },
});

describe('SocialsService', () => {
  let service: SocialsService;
  let repo: jest.Mocked<SocialsRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SocialsService,
        {
          provide: SocialsRepository,
          useValue: {
            findPostsByDateAndPlatform: jest.fn(),
            findRecentPostsByPlatform: jest.fn(),
            findScreeningsInRange: jest.fn(),
            findScreeningsByIds: jest.fn(),
            findScreeningById: jest.fn(),
            findPostByPlatformAndScreening: jest.fn(),
            upsertPost: jest.fn(),
            markPostPublished: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SocialsService);
    repo = module.get(SocialsRepository);
    repo.findRecentPostsByPlatform.mockResolvedValue([]);
  });

  describe('getCandidate', () => {
    it('should return ALREADY_PUBLISHED when posts exist for date range and platform', async () => {
      repo.findPostsByDateAndPlatform.mockResolvedValue([{ id: 1 }] as any);

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 20,
        platform: 'instagram',
        numberOfCandidates: 10,
      });

      expect(result.publish).toBe(false);
      expect(result.reason).toBe('ALREADY_PUBLISHED');
      expect(result.candidates).toEqual([]);
      expect(result.meta.bestScore).toBeNull();
      expect(repo.findScreeningsInRange).not.toHaveBeenCalled();
    });

    it('should allow another post when fewer posts exist than maxPosts', async () => {
      repo.findPostsByDateAndPlatform.mockResolvedValue([{ id: 1 }] as any);
      repo.findScreeningsInRange.mockResolvedValue([]);

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 20,
        platform: 'instagram',
        numberOfCandidates: 10,
        maxPosts: 2,
      });

      expect(result.reason).not.toBe('ALREADY_PUBLISHED');
      expect(repo.findScreeningsInRange).toHaveBeenCalled();
    });

    it('should return ALREADY_PUBLISHED when posts reach maxPosts', async () => {
      repo.findPostsByDateAndPlatform.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ] as any);

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 20,
        platform: 'instagram',
        numberOfCandidates: 10,
        maxPosts: 2,
      });

      expect(result.publish).toBe(false);
      expect(result.reason).toBe('ALREADY_PUBLISHED');
      expect(repo.findScreeningsInRange).not.toHaveBeenCalled();
    });

    it('should skip movies posted on the platform within the cooldown window', async () => {
      const recentMovie = makeScreening({
        id: 5,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 1975 }),
      });
      const freshMovie = makeScreening({
        id: 6,
        movieId: 2,
        movie: makeMovie({ id: 2, productionYear: 1976 }),
      });

      repo.findPostsByDateAndPlatform.mockResolvedValue([]);
      repo.findRecentPostsByPlatform.mockResolvedValue([
        { id: 99, movieId: 1 },
      ] as any);
      repo.findScreeningsInRange.mockResolvedValue([
        recentMovie,
        freshMovie,
      ] as any);
      repo.findScreeningsByIds.mockResolvedValue([freshMovie] as any);

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 20,
        platform: 'instagram',
        numberOfCandidates: 10,
      });

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].movieId).toBe(2);
    });

    it('should return NO_SCREENINGS_IN_RANGE when no screenings found', async () => {
      repo.findPostsByDateAndPlatform.mockResolvedValue([]);
      repo.findScreeningsInRange.mockResolvedValue([]);

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 20,
        platform: 'instagram',
        numberOfCandidates: 10,
      });

      expect(result.publish).toBe(false);
      expect(result.reason).toBe('NO_SCREENINGS_IN_RANGE');
      expect(result.meta.candidatesChecked).toBe(0);
      expect(result.candidates).toEqual([]);
    });

    it('should return HAS_HIGH_QUALITY_CANDIDATE with publish true when best score meets threshold', async () => {
      const screening = makeScreening({
        id: 5,
        movieId: 1,
        movie: makeMovie({
          id: 1,
          productionYear: 1975,
          movies_genres: [
            { id: 1, genreId: 1 },
            { id: 2, genreId: 2 },
          ],
        }),
        cinema: { city: { id: 1 } },
      });

      repo.findPostsByDateAndPlatform.mockResolvedValue([]);
      repo.findScreeningsInRange.mockResolvedValue([screening] as any);
      repo.findScreeningsByIds.mockResolvedValue([screening] as any);

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 30,
        platform: 'instagram',
        numberOfCandidates: 10,
      });

      expect(result.publish).toBe(true);
      expect(result.reason).toBe('HAS_HIGH_QUALITY_CANDIDATE');
      // deep classic (30) + multi_genre (10) = 40
      expect(result.meta.bestScore).toBe(40);
      expect(result.candidates).toHaveLength(1);
    });

    it('should return NO_HIGH_QUALITY_CANDIDATE with publish false when best score below threshold', async () => {
      const screening = makeScreening({
        id: 5,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 2020 }),
        cinema: { city: { id: 1 } },
      });

      repo.findPostsByDateAndPlatform.mockResolvedValue([]);
      repo.findScreeningsInRange.mockResolvedValue([screening] as any);
      repo.findScreeningsByIds.mockResolvedValue([screening] as any);

      // normal year = 10 points, minScore = 50
      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 50,
        platform: 'instagram',
        numberOfCandidates: 10,
      });

      expect(result.publish).toBe(false);
      expect(result.reason).toBe('NO_HIGH_QUALITY_CANDIDATE');
      expect(result.meta.bestScore).toBe(10);
      expect(result.meta.minScore).toBe(50);
    });

    it('should pass platform directly to repo (DTO handles normalization)', async () => {
      repo.findPostsByDateAndPlatform.mockResolvedValue([{ id: 1 }] as any);

      await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 20,
        platform: 'instagram',
        numberOfCandidates: 10,
      });

      expect(repo.findPostsByDateAndPlatform).toHaveBeenCalledWith(
        '2025-03-10',
        '2025-03-12',
        'instagram',
      );
    });

    it('should use default numberOfCandidates of 10 when not provided', async () => {
      const screenings = Array.from({ length: 15 }, (_, i) =>
        makeScreening({
          id: i + 1,
          movieId: i + 1,
          movie: makeMovie({ id: i + 1, productionYear: 2020 }),
          cinema: { city: { id: 1 } },
        }),
      );

      repo.findPostsByDateAndPlatform.mockResolvedValue([]);
      repo.findScreeningsInRange.mockResolvedValue(screenings as any);
      repo.findScreeningsByIds.mockResolvedValue(
        screenings.slice(0, 10) as any,
      );

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 5,
        platform: 'instagram',
        numberOfCandidates: 10,
      });

      expect(result.meta.candidatesChecked).toBe(10);
      expect(repo.findScreeningsByIds).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Number)]),
      );
    });

    it('should order candidates by score descending', async () => {
      const screeningLow = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 2020 }), // 10 pts
        cinema: { city: { id: 1 } },
      });
      const screeningHigh = makeScreening({
        id: 2,
        movieId: 2,
        movie: makeMovie({ id: 2, productionYear: 1970 }), // 30 pts
        cinema: { city: { id: 2 } },
      });

      repo.findPostsByDateAndPlatform.mockResolvedValue([]);
      repo.findScreeningsInRange.mockResolvedValue([
        screeningLow,
        screeningHigh,
      ] as any);
      repo.findScreeningsByIds.mockResolvedValue([
        screeningHigh,
        screeningLow,
      ] as any);

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 5,
        platform: 'instagram',
        numberOfCandidates: 10,
      });

      expect(result.candidates[0]).toEqual(screeningHigh);
    });
  });

  describe('scoring logic', () => {
    const runScoring = async (screenings: ScreeningWithCinemaCity[]) => {
      repo.findPostsByDateAndPlatform.mockResolvedValue([]);
      repo.findScreeningsInRange.mockResolvedValue(screenings as any);
      repo.findScreeningsByIds.mockResolvedValue(screenings as any);

      const result = await service.getCandidate({
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 0,
        platform: 'instagram',
        numberOfCandidates: 10,
      });
      return result;
    };

    it('should award 30 points for deep classic (year <= 1980)', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 1975 }),
      });

      const result = await runScoring([screening]);
      expect(result.meta.bestScore).toBe(30);
    });

    it('should exclude movies without a backdrop image', async () => {
      const noBackdrop = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 1975, backdropUrl: null }),
      });
      const withBackdrop = makeScreening({
        id: 2,
        movieId: 2,
        movie: makeMovie({ id: 2, productionYear: 2020 }),
      });

      const result = await runScoring([noBackdrop, withBackdrop]);

      // The deep classic would win, but without artwork it is not a
      // candidate at all - the modern movie is the only one left.
      expect(result.meta.candidatesChecked).toBe(1);
      expect(result.meta.bestScore).toBe(10);
    });

    it('should award up to 25 rating points scaled by votes', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({
          id: 1,
          productionYear: 1975,
          usersRating: 8.0,
          usersRatingVotes: 100000,
        }),
      });

      const result = await runScoring([screening]);
      // 30 (deep classic) + 25 (rating 8.0 at full vote confidence)
      expect(result.meta.bestScore).toBe(55);
    });

    it('should scale rating points down for few votes', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({
          id: 1,
          productionYear: 1975,
          usersRating: 8.0,
          usersRatingVotes: 100,
        }),
      });

      const result = await runScoring([screening]);
      // 30 + round(25 * 1.0 * (log10(100) / 5)) = 30 + 10
      expect(result.meta.bestScore).toBe(40);
    });

    it('should award no rating points at or below the quality baseline', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({
          id: 1,
          productionYear: 1975,
          usersRating: 5.0,
          usersRatingVotes: 100000,
        }),
      });

      const result = await runScoring([screening]);
      expect(result.meta.bestScore).toBe(30);
    });

    it('should award the critics bonus only for well-reviewed movies', async () => {
      const wellReviewed = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({
          id: 1,
          productionYear: 1975,
          criticsRating: 7.5,
          criticsRatingVotes: 10,
        }),
      });
      const fewReviews = makeScreening({
        id: 2,
        movieId: 2,
        movie: makeMovie({
          id: 2,
          productionYear: 1975,
          criticsRating: 9.0,
          criticsRatingVotes: 2,
        }),
      });

      const result = await runScoring([wellReviewed, fewReviews]);

      const scoring = result.meta.scoring!;
      const byMovie = new Map(scoring.map((s) => [s.movieId, s]));
      expect(byMovie.get(1)!.score).toBe(35);
      expect(byMovie.get(1)!.breakdown.critics).toBe(5);
      expect(byMovie.get(2)!.score).toBe(30);
      expect(byMovie.get(2)!.breakdown.critics).toBe(0);
    });

    it('should expose the score breakdown in meta.scoring', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({
          id: 1,
          productionYear: 1975,
          usersRating: 8.0,
          usersRatingVotes: 100000,
          movies_genres: [
            { id: 1, genreId: 1 },
            { id: 2, genreId: 2 },
          ],
        }),
      });

      const result = await runScoring([screening]);

      expect(result.meta.scoring![0]).toEqual({
        movieId: 1,
        screeningId: 1,
        score: 65,
        breakdown: {
          year: 30,
          multiCity: 0,
          multiGenre: 10,
          rating: 25,
          critics: 0,
        },
      });
    });

    it('should award 30 points for year exactly 1980', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 1980 }),
      });

      const result = await runScoring([screening]);
      expect(result.meta.bestScore).toBe(30);
    });

    it('should award 20 points for classic (1981-2000)', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 1995 }),
      });

      const result = await runScoring([screening]);
      expect(result.meta.bestScore).toBe(20);
    });

    it('should award 20 points for year exactly 2000', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 2000 }),
      });

      const result = await runScoring([screening]);
      expect(result.meta.bestScore).toBe(20);
    });

    it('should award 10 points for normal year (> 2000)', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 2023 }),
      });

      const result = await runScoring([screening]);
      expect(result.meta.bestScore).toBe(10);
    });

    it('should add 10 points for multi-genre (more than 1 genre)', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({
          id: 1,
          productionYear: 2023,
          movies_genres: [
            { id: 1, genreId: 1 },
            { id: 2, genreId: 2 },
          ],
        }),
      });

      const result = await runScoring([screening]);
      // normal (10) + multi_genre (10) = 20
      expect(result.meta.bestScore).toBe(20);
    });

    it('should not add multi-genre bonus for single genre', async () => {
      const screening = makeScreening({
        id: 1,
        movieId: 1,
        movie: makeMovie({
          id: 1,
          productionYear: 2023,
          movies_genres: [{ id: 1, genreId: 1 }],
        }),
      });

      const result = await runScoring([screening]);
      expect(result.meta.bestScore).toBe(10);
    });

    it('should add 20 points for multi-city (screenings in more than 1 city)', async () => {
      const movie = makeMovie({ id: 1, productionYear: 2023 });
      const screening1 = makeScreening({
        id: 1,
        movieId: 1,
        movie,
        cinema: { city: { id: 1 } },
      });
      const screening2 = makeScreening({
        id: 2,
        movieId: 1,
        movie,
        cinema: { city: { id: 2 } },
      });

      const result = await runScoring([screening1, screening2]);
      // normal (10) + multi_city (20) = 30
      expect(result.meta.bestScore).toBe(30);
    });

    it('should not add multi-city bonus for screenings in same city', async () => {
      const movie = makeMovie({ id: 1, productionYear: 2023 });
      const screening1 = makeScreening({
        id: 1,
        movieId: 1,
        movie,
        cinema: { city: { id: 1 } },
      });
      const screening2 = makeScreening({
        id: 2,
        movieId: 1,
        movie,
        cinema: { city: { id: 1 } },
      });

      const result = await runScoring([screening1, screening2]);
      expect(result.meta.bestScore).toBe(10);
    });

    it('should combine all bonuses: deep classic + multi-genre + multi-city', async () => {
      const movie = makeMovie({
        id: 1,
        productionYear: 1970,
        movies_genres: [
          { id: 1, genreId: 1 },
          { id: 2, genreId: 2 },
        ],
      });
      const screening1 = makeScreening({
        id: 1,
        movieId: 1,
        movie,
        cinema: { city: { id: 1 } },
      });
      const screening2 = makeScreening({
        id: 2,
        movieId: 1,
        movie,
        cinema: { city: { id: 2 } },
      });

      const result = await runScoring([screening1, screening2]);
      // deep_classic (30) + multi_genre (10) + multi_city (20) = 60
      expect(result.meta.bestScore).toBe(60);
    });

    it('should keep highest scoring screening per movie', async () => {
      const movie = makeMovie({ id: 1, productionYear: 2023 });
      // Same movie, two cities => multi-city bonus applies to both screenings
      // but only one candidate per movie is kept (the higher score)
      const screening1 = makeScreening({
        id: 1,
        movieId: 1,
        movie,
        cinema: { city: { id: 1 } },
      });
      const screening2 = makeScreening({
        id: 2,
        movieId: 1,
        movie,
        cinema: { city: { id: 2 } },
      });

      const result = await runScoring([screening1, screening2]);
      expect(result.meta.candidatesChecked).toBe(1);
    });

    it('should skip screenings without movie data', async () => {
      const screening = makeScreening({ id: 1, movieId: 1 });
      (screening as any).movie = null;

      const result = await runScoring([screening]);
      // Has screenings so not NO_SCREENINGS_IN_RANGE, but no scorable candidates
      expect(result.meta.candidatesChecked).toBe(0);
    });
  });

  describe('reserveCandidate', () => {
    it('should throw NotFoundException when screening does not exist', async () => {
      repo.findScreeningById.mockResolvedValue(undefined);

      await expect(
        service.reserveCandidate({ platform: 'instagram', screeningId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when post already reserved', async () => {
      const screening = makeScreening({ id: 5, movieId: 1 });
      repo.findScreeningById.mockResolvedValue(screening);
      repo.findPostByPlatformAndScreening.mockResolvedValue({ id: 1 } as any);

      await expect(
        service.reserveCandidate({ platform: 'instagram', screeningId: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call upsertPost with correct data on success', async () => {
      const screening = makeScreening({
        id: 5,
        movieId: 1,
        movie: makeMovie({ id: 1, productionYear: 1990 }),
        cinema: { city: { id: 1 } },
      });
      repo.findScreeningById.mockResolvedValue(screening);
      repo.findPostByPlatformAndScreening.mockResolvedValue(undefined);
      repo.upsertPost.mockResolvedValue(undefined);

      await service.reserveCandidate({ platform: 'instagram', screeningId: 5 });

      expect(repo.upsertPost).toHaveBeenCalledWith({
        postDate: '2025-03-15',
        platform: 'instagram',
        score: 20, // classic year
        screeningId: 5,
        movieId: 1,
        contentType: 'feed_candidate',
        published: false,
        reason: 'RESERVED',
      });
    });
  });

  describe('publishCandidate', () => {
    it('should throw NotFoundException when screening does not exist', async () => {
      repo.findScreeningById.mockResolvedValue(undefined);

      await expect(
        service.publishCandidate({ platform: 'instagram', screeningId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when socials post does not exist', async () => {
      const screening = makeScreening({ id: 5, movieId: 1 });
      repo.findScreeningById.mockResolvedValue(screening);
      repo.findPostByPlatformAndScreening.mockResolvedValue(undefined);

      await expect(
        service.publishCandidate({ platform: 'instagram', screeningId: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when post already published', async () => {
      const screening = makeScreening({ id: 5, movieId: 1 });
      repo.findScreeningById.mockResolvedValue(screening);
      repo.findPostByPlatformAndScreening.mockResolvedValue({
        id: 1,
        published: true,
      } as any);

      await expect(
        service.publishCandidate({ platform: 'instagram', screeningId: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call markPostPublished on success', async () => {
      const screening = makeScreening({ id: 5, movieId: 1 });
      repo.findScreeningById.mockResolvedValue(screening);
      repo.findPostByPlatformAndScreening.mockResolvedValue({
        id: 42,
        published: false,
      } as any);
      repo.markPostPublished.mockResolvedValue(undefined);

      await service.publishCandidate({ platform: 'instagram', screeningId: 5 });

      expect(repo.markPostPublished).toHaveBeenCalledWith(42, '2025-03-11');
    });
  });
});
