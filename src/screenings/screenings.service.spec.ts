jest.mock('node:crypto', () => ({ randomInt: jest.fn() }));
jest.mock('../lib/date', () => ({
  getDateRangeUpToMonthFromNow: jest
    .fn()
    .mockReturnValue({ startDay: '2025-01-01', endDay: '2025-02-01' }),
}));
jest.mock('./screenings.mapper', () => ({
  mapScreening: jest.fn((s) => ({ id: s.id, mapped: true })),
  mapScreeningGroup: jest.fn((movie, screenings) => ({
    movie: { id: movie.id },
    screenings: screenings.map((s) => ({ id: s.id })),
  })),
}));
jest.mock('../movies/movies.mapper', () => ({
  mapMovieHero: jest.fn((m) => ({ id: m.id, title: m.title })),
}));

import { Test } from '@nestjs/testing';
import { randomInt } from 'node:crypto';
import { ScreeningsService } from './screenings.service';
import { ScreeningsRepository } from './screenings.repository';
import { mapScreening, mapScreeningGroup } from './screenings.mapper';
import { mapMovieHero } from '../movies/movies.mapper';

const mockRandomInt = randomInt as jest.MockedFunction<typeof randomInt>;

describe('ScreeningsService', () => {
  let service: ScreeningsService;
  let repo: jest.Mocked<ScreeningsRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ScreeningsService,
        {
          provide: ScreeningsRepository,
          useValue: {
            findFilteredMovieIds: jest.fn(),
            findMoviesWithScreenings: jest.fn(),
            findRetroMovieIds: jest.fn(),
            findCandidateRetroMovieIds: jest.fn(),
            findMovieWithScreeningsById: jest.fn(),
            insert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ScreeningsService);
    repo = module.get(ScreeningsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getScreenings', () => {
    it('should return empty array when no movieIds found', async () => {
      repo.findFilteredMovieIds.mockResolvedValue([]);

      const result = await service.getScreenings({ citySlug: 'warszawa' });

      expect(result).toEqual([]);
      expect(repo.findMoviesWithScreenings).not.toHaveBeenCalled();
    });

    it('should return flat mapped screenings when movieId param is provided', async () => {
      repo.findFilteredMovieIds.mockResolvedValue([42]);
      repo.findMoviesWithScreenings.mockResolvedValue([
        {
          id: 42,
          title: 'Blade Runner',
          screenings: [
            { id: 1, date: new Date('2025-01-10'), cinemaId: 5 },
            { id: 2, date: new Date('2025-01-11'), cinemaId: 6 },
          ],
        },
      ]);

      const result = await service.getScreenings({ movieId: 42 });

      expect(result).toHaveLength(2);
      expect(mapScreening).toHaveBeenCalledTimes(2);
      expect(mapScreeningGroup).not.toHaveBeenCalled();
    });

    it('should return grouped screenings when no movieId param', async () => {
      repo.findFilteredMovieIds.mockResolvedValue([10, 20]);
      repo.findMoviesWithScreenings.mockResolvedValue([
        {
          id: 10,
          title: 'Pulp Fiction',
          screenings: [{ id: 1, date: new Date('2025-01-10') }],
        },
        {
          id: 20,
          title: 'Fight Club',
          screenings: [{ id: 2, date: new Date('2025-01-12') }],
        },
      ]);

      const result = await service.getScreenings({});

      expect(result).toHaveLength(2);
      expect(mapScreeningGroup).toHaveBeenCalledTimes(2);
      expect(mapScreening).not.toHaveBeenCalled();
    });

    it('should filter out movies with no screenings', async () => {
      repo.findFilteredMovieIds.mockResolvedValue([10, 20]);
      repo.findMoviesWithScreenings.mockResolvedValue([
        {
          id: 10,
          title: 'Pulp Fiction',
          screenings: [{ id: 1, date: new Date('2025-01-10') }],
        },
        { id: 20, title: 'Ghost Movie', screenings: [] },
      ]);

      const result = await service.getScreenings({});

      expect(result).toHaveLength(1);
    });
  });

  describe('getRandomRetroScreening', () => {
    it('should return null when no retro movies exist', async () => {
      repo.findRetroMovieIds.mockResolvedValue([]);

      const result = await service.getRandomRetroScreening();

      expect(result).toBeNull();
      expect(repo.findCandidateRetroMovieIds).not.toHaveBeenCalled();
    });

    it('should return null when no candidate retro movies have screenings', async () => {
      repo.findRetroMovieIds.mockResolvedValue([100, 200]);
      repo.findCandidateRetroMovieIds.mockResolvedValue([]);

      const result = await service.getRandomRetroScreening();

      expect(result).toBeNull();
      expect(repo.findMovieWithScreeningsById).not.toHaveBeenCalled();
    });

    it('should return null when chosen movie has no screenings', async () => {
      repo.findRetroMovieIds.mockResolvedValue([100]);
      repo.findCandidateRetroMovieIds.mockResolvedValue([100]);
      mockRandomInt.mockReturnValueOnce(0);
      repo.findMovieWithScreeningsById.mockResolvedValue(null);

      const result = await service.getRandomRetroScreening();

      expect(result).toBeNull();
    });

    it('should return random retro screening on success', async () => {
      const movieData = {
        id: 100,
        title: 'Casablanca',
        year: 1942,
        screenings: [
          { id: 501, date: new Date('2025-01-15'), cinemaId: 3 },
          { id: 502, date: new Date('2025-01-16'), cinemaId: 7 },
        ],
      };

      repo.findRetroMovieIds.mockResolvedValue([100, 200, 300]);
      repo.findCandidateRetroMovieIds.mockResolvedValue([100, 300]);
      mockRandomInt.mockReturnValueOnce(0); // pick movie index 0 -> movieId 100
      repo.findMovieWithScreeningsById.mockResolvedValue(movieData);
      mockRandomInt.mockReturnValueOnce(1); // pick screening index 1 -> id 502

      const result = await service.getRandomRetroScreening();

      expect(result).toEqual({
        movie: { id: 100, title: 'Casablanca' },
        screening: { id: 502, mapped: true },
      });
      expect(mockRandomInt).toHaveBeenCalledWith(0, 2); // candidateMovieIds.length
      expect(mockRandomInt).toHaveBeenCalledWith(0, 2); // screenings.length
      expect(repo.findMovieWithScreeningsById).toHaveBeenCalledWith(
        100,
        '2025-01-01',
        '2025-02-01',
      );
      expect(mapMovieHero).toHaveBeenCalledWith({
        id: 100,
        title: 'Casablanca',
        year: 1942,
      });
      expect(mapScreening).toHaveBeenCalledWith(movieData.screenings[1]);
    });
  });

  describe('createScreening', () => {
    it('should delegate to repository', async () => {
      const dto = {
        movieId: 42,
        cinemaId: 5,
        showtimeId: 99,
        date: '2025-01-20',
        url: 'https://kino.pl/tickets/99',
        isDubbing: false,
        isSubtitled: true,
      };
      const created = {
        id: 1,
        ...dto,
        date: new Date(dto.date),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repo.insert.mockResolvedValue(created);

      const result = await service.createScreening(dto as any);

      expect(result).toEqual(created);
      expect(repo.insert).toHaveBeenCalledWith(dto);
    });
  });
});
