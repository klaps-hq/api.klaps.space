import { Test } from '@nestjs/testing';
import { ScreeningsService } from './screenings.service';
import { DRIZZLE } from '../database/constants';

describe('ScreeningsService', () => {
  let service: ScreeningsService;
  let mockDb: any;

  const sampleMovieWithScreenings = {
    id: 1,
    slug: 'test-movie-2024',
    title: 'Test Movie',
    titleOriginal: '',
    description: '',
    productionYear: 2024,
    duration: 120,
    language: 'pl',
    posterUrl: null,
    url: 'https://filmweb.pl/1',
    movies_genres: [{ genre: { id: 1, slug: 'drama', name: 'Drama' } }],
    movies_actors: [],
    movies_directors: [],
    movies_scriptwriters: [],
    movies_countries: [],
    screenings: [
      {
        id: 10,
        url: 'https://ticket.pl/1',
        date: new Date('2024-08-15T18:00:00Z'),
        isDubbing: false,
        isSubtitled: false,
        cinema: {
          id: 5,
          slug: 'kino-a',
          name: 'Kino A',
          street: null,
          url: '',
          latitude: null,
          longitude: null,
          city: { id: 1, slug: 'warszawa', name: 'Warszawa', nameDeclinated: 'Warszawie' },
        },
      },
    ],
  };

  beforeEach(async () => {
    const mockInsertChain = {
      values: jest.fn().mockReturnThis(),
      onDuplicateKeyUpdate: jest.fn().mockReturnThis(),
      $returningId: jest.fn().mockResolvedValue([{ id: 1 }]),
    };

    mockDb = {
      query: {
        movies: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
        screenings: { findFirst: jest.fn() },
      },
      insert: jest.fn().mockReturnValue(mockInsertChain),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ total: 1 }]),
            }),
          }),
        }),
      }),
      selectDistinct: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([{ movieId: 1 }]),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [ScreeningsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get(ScreeningsService);
  });

  describe('getScreenings', () => {
    it('returns paginated screening groups', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([
        sampleMovieWithScreenings,
      ]);

      const result = await service.getScreenings();

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('returns empty data when no movieIds match', async () => {
      mockDb.selectDistinct.mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ total: 0 }]),
            }),
          }),
        }),
      });

      const result = await service.getScreenings();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getRandomRetroScreening', () => {
    it('returns null when no retro movies exist', async () => {
      mockDb.query.movies.findMany.mockResolvedValue([]);

      const result = await service.getRandomRetroScreening();

      expect(result).toBeNull();
    });
  });

  describe('createScreening', () => {
    it('upserts and returns the screening', async () => {
      const dto = {
        url: 'https://ticket.pl/1',
        movieId: 1,
        showtimeId: 1,
        cinemaId: 1,
        type: '2D',
        date: '2024-08-15T18:00:00Z',
        isDubbing: false,
        isSubtitled: false,
      };
      const screeningRow = { id: 1, ...dto, date: new Date(dto.date) };
      mockDb.query.screenings.findFirst.mockResolvedValue(screeningRow);

      const result = await service.createScreening(dto as any);

      expect(result.id).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
