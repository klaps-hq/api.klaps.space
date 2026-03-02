import { Test } from '@nestjs/testing';
import { SocialsService } from './socials.service';
import { DRIZZLE } from '../database/constants';

const BASE_DATE_FROM = '2026-03-01';
const BASE_DATE_TO = '2026-03-03';
const PLATFORM = 'instagram';
const MIN_SCORE = 60;
const CADENCE_DAYS = 1;

/** Screening shape returned by db.query.screenings.findMany with movie + cinema relations */
const makeScreening = (overrides: Record<string, unknown> = {}) => ({
  id: 100,
  movieId: 1,
  cinemaId: 5,
  showtimeId: 1,
  type: 'standard',
  date: new Date('2026-03-03T19:00:00Z'),
  isDubbing: false,
  isSubtitled: true,
  url: 'https://tickets.pl/100',
  movie: {
    id: 1,
    productionYear: 1982,
    movies_genres: [
      { genre: { id: 1, slug: 'sci-fi', name: 'Sci-Fi' } },
      { genre: { id: 2, slug: 'drama', name: 'Drama' } },
    ],
  },
  cinema: {
    city: { id: 1 },
  },
  ...overrides,
});

const makeMockDb = () => {
  const insertChain = {
    values: jest.fn().mockReturnThis(),
    onDuplicateKeyUpdate: jest.fn().mockResolvedValue(undefined),
  };

  return {
    query: {
      socials_posts: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      movies: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      screenings: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
    insert: jest.fn().mockReturnValue(insertChain),
  };
};

describe('SocialService', () => {
  let service: SocialsService;
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    mockDb = makeMockDb();

    const module = await Test.createTestingModule({
      providers: [SocialsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get(SocialsService);
  });

  describe('getCandidate', () => {
    it('returns ALREADY_PUBLISHED when a post exists for the date range and platform', async () => {
      mockDb.query.socials_posts.findMany.mockResolvedValue([
        {
          postDate: BASE_DATE_FROM,
          platform: PLATFORM,
        },
      ]);

      const result = await service.getCandidate(
        BASE_DATE_FROM,
        BASE_DATE_TO,
        MIN_SCORE,
        PLATFORM,
        CADENCE_DAYS,
      );

      expect(result).toEqual({
        publish: false,
        date: {
          from: BASE_DATE_FROM,
          to: BASE_DATE_TO,
        },
        reason: 'ALREADY_PUBLISHED',
        meta: { candidatesChecked: 1, bestScore: null, minScore: MIN_SCORE },
        candidates: [],
      });
    });
  });

  describe('getCandidate when no screenings are found for the date range', () => {
    it('returns NO_SCREENINGS_IN_RANGE', async () => {
      mockDb.query.screenings.findMany.mockResolvedValue([]);

      const result = await service.getCandidate(
        BASE_DATE_FROM,
        BASE_DATE_TO,
        MIN_SCORE,
        PLATFORM,
        CADENCE_DAYS,
      );

      expect(result).toEqual({
        publish: false,
        date: {
          from: BASE_DATE_FROM,
          to: BASE_DATE_TO,
        },
        reason: 'NO_SCREENINGS_IN_RANGE',
        meta: { candidatesChecked: 0, bestScore: null, minScore: MIN_SCORE },
        candidates: [],
      });
    });
  });

  describe('getCandidate when a high quality candidate is found', () => {
    it('returns HAS_HIGH_QUALITY_CANDIDATE', async () => {
      const screening100 = makeScreening({
        id: 100,
        movieId: 1,
        movie: {
          productionYear: 1979,
          movies_genres: [{ genre: { id: 1 } }, { genre: { id: 2 } }],
        },
        cinema: { city: { id: 1 } },
      });
      const screening101 = makeScreening({
        id: 101,
        movieId: 1,
        movie: {
          productionYear: 1979,
          movies_genres: [{ genre: { id: 1 } }, { genre: { id: 2 } }],
        },
        cinema: { city: { id: 2 } },
      });
      // DEEP_CLASSIC(20) + MULTI_GENRE(10) + MULTI_CITY(20) = 50
      mockDb.query.screenings.findMany
        .mockResolvedValueOnce([screening100, screening101])
        .mockResolvedValueOnce([screening100]); // second call: fetch by candidate ids

      const result = await service.getCandidate(
        BASE_DATE_FROM,
        BASE_DATE_TO,
        50,
        PLATFORM,
        CADENCE_DAYS,
      );

      expect(result).toEqual({
        publish: true,
        date: {
          from: BASE_DATE_FROM,
          to: BASE_DATE_TO,
        },
        reason: 'HAS_HIGH_QUALITY_CANDIDATE',
        meta: { candidatesChecked: 1, bestScore: 50, minScore: 50 },
        candidates: [screening100],
      });
    });
  });

  describe('getCandidate when a low quality candidate is found', () => {
    it('returns NO_HIGH_QUALITY_CANDIDATE when best score is below minScore', async () => {
      const screening100 = makeScreening({
        id: 100,
        movieId: 1,
        movie: {
          productionYear: 1982,
          movies_genres: [{ genre: { id: 1 } }, { genre: { id: 2 } }],
        },
        cinema: { city: { id: 1 } },
      });
      // CLASSIC(10) + MULTI_GENRE(10) = 20, single city
      mockDb.query.screenings.findMany
        .mockResolvedValueOnce([screening100])
        .mockResolvedValueOnce([screening100]); // second call: fetch by candidate ids

      const result = await service.getCandidate(
        BASE_DATE_FROM,
        BASE_DATE_TO,
        MIN_SCORE,
        PLATFORM,
        CADENCE_DAYS,
      );

      expect(result).toEqual({
        publish: false,
        date: {
          from: BASE_DATE_FROM,
          to: BASE_DATE_TO,
        },
        reason: 'NO_HIGH_QUALITY_CANDIDATE',
        meta: { candidatesChecked: 1, bestScore: 20, minScore: MIN_SCORE },
        candidates: [screening100],
      });
    });
  });

  describe('getCandidate with numberOfCandidates > 1', () => {
    it('returns the top numberOfCandidates candidates', async () => {
      const screening100 = makeScreening({
        id: 100,
        movieId: 1,
        movie: {
          productionYear: 1979,
          movies_genres: [{ genre: { id: 1 } }, { genre: { id: 2 } }],
        },
        cinema: { city: { id: 1 } },
      });
      const screening101 = makeScreening({
        id: 101,
        movieId: 1,
        movie: {
          productionYear: 1979,
          movies_genres: [{ genre: { id: 1 } }, { genre: { id: 2 } }],
        },
        cinema: { city: { id: 2 } },
      });
      const screening102 = makeScreening({
        id: 102,
        movieId: 2,
        movie: {
          productionYear: 1979,
          movies_genres: [{ genre: { id: 1 } }, { genre: { id: 2 } }],
        },
        cinema: { city: { id: 1 } },
      });
      const screening103 = makeScreening({
        id: 103,
        movieId: 3,
        movie: {
          productionYear: 1979,
          movies_genres: [{ genre: { id: 1 } }, { genre: { id: 2 } }],
        },
        cinema: { city: { id: 1 } },
      });
      // 3 movies: movie 1 scores 50 (DEEP_CLASSIC+MULTI_GENRE+MULTI_CITY), movies 2–3 score 30
      mockDb.query.screenings.findMany
        .mockResolvedValueOnce([
          screening100,
          screening101,
          screening102,
          screening103,
        ])
        .mockResolvedValueOnce([screening100, screening102, screening103]); // second call: top 3 by movie

      const result = await service.getCandidate(
        BASE_DATE_FROM,
        BASE_DATE_TO,
        50,
        PLATFORM,
        3, // numberOfCandidates
      );

      expect(result).toEqual({
        publish: true,
        date: {
          from: BASE_DATE_FROM,
          to: BASE_DATE_TO,
        },
        reason: 'HAS_HIGH_QUALITY_CANDIDATE',
        meta: { candidatesChecked: 3, bestScore: 50, minScore: 50 },
        candidates: [screening100, screening102, screening103],
      });
    });
  });
});
