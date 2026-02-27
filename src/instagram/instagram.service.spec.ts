import { Test } from '@nestjs/testing';
import { InstagramService } from './instagram.service';
import { DRIZZLE } from '../database/constants';

const BASE_DATE = '2026-03-01';

const makeMovie = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  slug: 'blade-runner-1982',
  title: 'Blade Runner',
  titleOriginal: 'Blade Runner',
  description: 'A classic sci-fi film',
  productionYear: 1982,
  duration: 117,
  language: 'en',
  posterUrl: 'https://img.pl/poster.jpg',
  backdropUrl: 'https://img.pl/backdrop.jpg',
  url: 'https://filmweb.pl/blade-runner',
  movies_genres: [
    { genre: { id: 1, slug: 'sci-fi', name: 'Sci-Fi' } },
    { genre: { id: 2, slug: 'drama', name: 'Drama' } },
  ],
  screenings: [
    {
      id: 100,
      url: 'https://tickets.pl/100',
      date: new Date('2026-03-03T19:00:00Z'),
      isDubbing: false,
      isSubtitled: true,
      cinema: {
        id: 5,
        slug: 'kino-a',
        name: 'Kino A',
        street: null,
        url: '',
        latitude: null,
        longitude: null,
        city: {
          id: 1,
          slug: 'warszawa',
          name: 'Warszawa',
          nameDeclinated: 'Warszawie',
        },
      },
    },
  ],
  ...overrides,
});

const makeMockDb = () => {
  const insertChain = {
    values: jest.fn().mockReturnThis(),
    onDuplicateKeyUpdate: jest.fn().mockResolvedValue(undefined),
  };

  return {
    query: {
      instagram_posts: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      movies: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      screenings: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn().mockReturnValue(insertChain),
  };
};

describe('InstagramService', () => {
  let service: InstagramService;
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    mockDb = makeMockDb();

    const module = await Test.createTestingModule({
      providers: [InstagramService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get(InstagramService);
  });

  describe('getCandidate', () => {
    it('returns cached decision when one exists (idempotent)', async () => {
      mockDb.query.instagram_posts.findFirst.mockResolvedValue({
        id: 1,
        postDate: BASE_DATE,
        movieId: 1,
        screeningId: 100,
        score: 80,
        published: true,
        reason: 'HIGH_QUALITY_CANDIDATE',
      });
      mockDb.query.movies.findFirst.mockResolvedValue(makeMovie());
      mockDb.query.screenings.findFirst.mockResolvedValue(
        makeMovie().screenings[0],
      );

      const result = await service.getCandidate(BASE_DATE);

      expect(result.publish).toBe(true);
      expect(result.date).toBe(BASE_DATE);
      expect(mockDb.query.movies.findMany).not.toHaveBeenCalled();
    });

    it('returns publish=true for a high-scoring classic', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([makeMovie()]);

      const result = await service.getCandidate(BASE_DATE);

      expect(result.publish).toBe(true);
      if (result.publish) {
        expect(result.reason).toBe('HIGH_QUALITY_CANDIDATE');
        expect(result.score).toBeGreaterThanOrEqual(60);
        expect(result.movie.title).toBe('Blade Runner');
      }
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('returns publish=false when no classic movies have screenings', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([]);

      const result = await service.getCandidate(BASE_DATE);

      expect(result.publish).toBe(false);
      if (!result.publish) {
        expect(result.reason).toBe('NO_HIGH_QUALITY_CANDIDATE');
        expect(result.meta.candidatesChecked).toBe(0);
      }
    });

    it('returns publish=false when best score is below threshold', async () => {
      const weakMovie = makeMovie({
        productionYear: 1995,
        movies_genres: [{ genre: { id: 1, slug: 'drama', name: 'Drama' } }],
        screenings: [
          {
            id: 200,
            url: 'https://tickets.pl/200',
            date: new Date('2026-03-07T20:00:00Z'),
            isDubbing: true,
            isSubtitled: false,
            cinema: {
              id: 5,
              slug: 'kino-a',
              name: 'Kino A',
              street: null,
              url: '',
              latitude: null,
              longitude: null,
              city: {
                id: 1,
                slug: 'warszawa',
                name: 'Warszawa',
                nameDeclinated: 'Warszawie',
              },
            },
          },
        ],
      });
      mockDb.query.movies.findMany.mockResolvedValue([weakMovie]);

      const result = await service.getCandidate(BASE_DATE);

      expect(result.publish).toBe(false);
      if (!result.publish) {
        expect(result.meta.bestScore).not.toBeNull();
        expect(result.meta.bestScore!).toBeLessThan(60);
      }
    });

    it('excludes movies in hard cooldown', async () => {
      mockDb.query.instagram_posts.findMany.mockResolvedValue([
        { movieId: 1, postDate: '2026-02-20' },
      ]);
      mockDb.query.movies.findMany.mockResolvedValue([makeMovie()]);

      const result = await service.getCandidate(BASE_DATE);

      expect(result.publish).toBe(false);
      if (!result.publish) {
        expect(result.meta.candidatesChecked).toBe(0);
      }
    });

    it('applies deep classic bonus for pre-1980 movies', async () => {
      const deepClassic = makeMovie({ productionYear: 1960 });
      const classic90s = makeMovie({
        id: 2,
        productionYear: 1995,
        screenings: [
          {
            ...makeMovie().screenings[0],
            id: 201,
          },
        ],
      });
      mockDb.query.movies.findMany.mockResolvedValue([deepClassic, classic90s]);

      const result = await service.getCandidate(BASE_DATE);

      expect(result.publish).toBe(true);
      if (result.publish) {
        expect(result.movie.productionYear).toBe(1960);
      }
    });
  });
});
