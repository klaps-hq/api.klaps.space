jest.mock('node:crypto', () => ({ randomInt: jest.fn() }));
jest.mock('../lib/date', () => ({
  getDateRangeUpToMonthFromNow: jest
    .fn()
    .mockReturnValue({ startDay: '2025-01-01', endDay: '2025-02-01' }),
  getTodayInPoland: jest.fn().mockReturnValue('2026-10-28'),
  getNowInPolandWallClock: jest
    .fn()
    .mockReturnValue(new Date('2026-10-30T12:00:00.000Z')),
  getDatePlusDays: jest.requireActual('../lib/date').getDatePlusDays,
}));
jest.mock('./screenings.mapper', () => ({
  mapScreening: jest.fn((s: any) => ({ id: s.id, mapped: true })),
  mapScreeningGroup: jest.fn((movie: any, screenings: any[]) => ({
    movie: { id: movie.id },
    screenings: screenings.map((s: any) => ({ id: s.id })),
  })),
}));
jest.mock('../movies/movies.mapper', () => ({
  mapMovieHero: jest.fn((m: any) => ({ id: m.id, title: m.title })),
  mapMovieSummary: jest.fn((m: any) => ({ id: m.id, slug: m.slug })),
}));

import { Test } from '@nestjs/testing';
import { randomInt } from 'node:crypto';
import { ScreeningsService } from './screenings.service';
import { ScreeningsRepository } from './screenings.repository';
import { IndexNowService } from '../indexnow/indexnow.service';
import { mapScreening, mapScreeningGroup } from './screenings.mapper';
import { mapMovieHero } from '../movies/movies.mapper';

const mockRandomInt = randomInt as jest.Mock;

describe('ScreeningsService', () => {
  let service: ScreeningsService;
  let repo: jest.Mocked<ScreeningsRepository>;
  let indexNowService: jest.Mocked<IndexNowService>;

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
            findLastUpdatedAt: jest.fn(),
            findRecentMovieStats: jest.fn(),
            findRecentVenueStats: jest.fn(),
            findMovieSummariesByIds: jest.fn(),
            findMovieIdsWithScreeningsBetween: jest.fn(),
            findProfileData: jest.fn(),
            insert: jest.fn(),
          },
        },
        {
          provide: IndexNowService,
          useValue: {
            notifyContentChanged: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ScreeningsService);
    repo = module.get(ScreeningsRepository);
    indexNowService = module.get(IndexNowService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getScreenings', () => {
    it('should return empty array when no movieIds found', async () => {
      repo.findFilteredMovieIds.mockResolvedValue([]);

      const result = await service.getScreenings({ citySlug: 'warszawa' });

      expect(result).toEqual([]);
      expect(repo.findMoviesWithScreenings).not.toHaveBeenCalled();
    });

    it('should pass the classic filter to the repository, judged per screening there', async () => {
      repo.findFilteredMovieIds.mockResolvedValue([]);

      await service.getScreenings({ classic: true, openAir: true });

      expect(repo.findFilteredMovieIds).toHaveBeenCalledWith(
        expect.objectContaining({ classic: true, openAir: true }),
      );
    });

    it('should not filter classics without classic', async () => {
      repo.findFilteredMovieIds.mockResolvedValue([]);

      await service.getScreenings({});

      expect(repo.findFilteredMovieIds).toHaveBeenCalledWith(
        expect.objectContaining({ classic: undefined }),
      );
    });

    it('should keep only open-air screenings inside each movie', async () => {
      repo.findFilteredMovieIds.mockResolvedValue([1]);
      repo.findMoviesWithScreenings.mockResolvedValue([]);

      await service.getScreenings({ openAir: true, citySlug: 'lodz' });

      expect(repo.findMoviesWithScreenings).toHaveBeenCalledWith(
        [1],
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ openAir: true, citySlug: 'lodz' }),
      );
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
      ] as any);

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
      ] as any);

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
      ] as any);

      const result = await service.getScreenings({});

      expect(result).toHaveLength(1);
    });
  });

  describe('getLastUpdatedAt', () => {
    it('should return ISO timestamp of newest screening', async () => {
      const updatedAt = new Date('2026-06-07T10:00:00.000Z');
      repo.findLastUpdatedAt.mockResolvedValue(updatedAt);

      const result = await service.getLastUpdatedAt({ citySlug: 'krakow' });

      expect(result).toEqual({ updatedAt: '2026-06-07T10:00:00.000Z' });
      expect(repo.findLastUpdatedAt).toHaveBeenCalledWith({
        citySlug: 'krakow',
      });
    });

    it('should return null when no screening matches', async () => {
      repo.findLastUpdatedAt.mockResolvedValue(null);

      const result = await service.getLastUpdatedAt();

      expect(result).toEqual({ updatedAt: null });
    });
  });

  describe('getRecentVenues', () => {
    it('should look back 90 days from midnight and cap at 12 venues', async () => {
      repo.findRecentVenueStats.mockResolvedValue([]);

      await service.getRecentVenues({ movieId: 7 });

      const call = repo.findRecentVenueStats.mock.calls[0][0];
      const spanDays =
        (call.until.getTime() - call.since.getTime()) / 86_400_000;
      expect(Math.round(spanDays)).toBe(90);
      expect(call.limit).toBe(12);
      expect(call.movieId).toBe(7);
      expect(call.until.getHours()).toBe(0);
    });

    it('should map rows and keep the wall-clock date', async () => {
      repo.findRecentVenueStats.mockResolvedValue([
        {
          cinemaSlug: 'kino-muzeum',
          cinemaName: 'Kino Muzeum',
          cityName: 'Toruń',
          citySlug: 'torun',
          // A late screening stored as wall time labelled UTC.
          lastScreeningDate: new Date('2026-09-20T23:30:00.000Z'),
          screeningsCount: '3' as any,
        },
        {
          cinemaSlug: 'kino-x',
          cinemaName: 'Kino X',
          cityName: 'Łódź',
          citySlug: 'lodz',
          lastScreeningDate: null,
          screeningsCount: 1,
        },
      ]);

      const result = await service.getRecentVenues({ movieId: 7 });

      expect(result).toEqual([
        {
          cinema: {
            slug: 'kino-muzeum',
            name: 'Kino Muzeum',
            city: { name: 'Toruń', slug: 'torun' },
          },
          lastScreeningDate: '2026-09-20',
          screeningsCount: 3,
        },
      ]);
    });
  });

  describe('getRecentScreenings', () => {
    it('should return an empty list without loading movies', async () => {
      repo.findRecentMovieStats.mockResolvedValue([]);

      const result = await service.getRecentScreenings({ cinemaId: 5 });

      expect(result).toEqual([]);
      expect(repo.findMovieSummariesByIds).not.toHaveBeenCalled();
      expect(repo.findMovieIdsWithScreeningsBetween).not.toHaveBeenCalled();
    });

    it('should look back 90 days and return 12 films by default', async () => {
      repo.findRecentMovieStats.mockResolvedValue([]);

      await service.getRecentScreenings({ citySlug: 'krakow' });

      const call = repo.findRecentMovieStats.mock.calls[0][0];
      const spanDays =
        (call.until.getTime() - call.since.getTime()) / 86_400_000;
      expect(Math.round(spanDays)).toBe(90);
      // Twice the page size, so dropping duplicates still fills 12.
      expect(call.limit).toBe(24);
      expect(call.citySlug).toBe('krakow');
      // The window ends at midnight today, so only past screenings count.
      expect(call.until.getHours()).toBe(0);
      expect(call.until.getMinutes()).toBe(0);
    });

    it('should pass a custom window and limit through', async () => {
      repo.findRecentMovieStats.mockResolvedValue([]);

      await service.getRecentScreenings({ cinemaId: 5, days: 30, limit: 6 });

      const call = repo.findRecentMovieStats.mock.calls[0][0];
      const spanDays =
        (call.until.getTime() - call.since.getTime()) / 86_400_000;
      expect(Math.round(spanDays)).toBe(30);
      expect(call.limit).toBe(12);
      expect(call.cinemaId).toBe(5);
    });

    it('should pass the open-air and classic filters through', async () => {
      repo.findRecentMovieStats.mockResolvedValue([]);

      await service.getRecentScreenings({
        openAir: true,
        classic: true,
        days: 365,
      });

      const call = repo.findRecentMovieStats.mock.calls[0][0];
      expect(call.openAir).toBe(true);
      expect(call.classic).toBe(true);
    });

    it('should map films in the order the repository returned them', async () => {
      repo.findRecentMovieStats.mockResolvedValue([
        {
          movieId: 9,
          lastScreeningDate: new Date('2026-09-20T23:30:00.000Z'),
          screeningsCount: 4,
        },
        {
          movieId: 7,
          lastScreeningDate: new Date('2026-08-02T18:00:00.000Z'),
          screeningsCount: 1,
        },
      ]);
      repo.findMovieSummariesByIds.mockResolvedValue([
        { id: 7, slug: 'b', title: 'Kes', productionYear: 1969 },
        { id: 9, slug: 'a', title: 'Dekalog', productionYear: 1989 },
      ] as any);
      repo.findMovieIdsWithScreeningsBetween.mockResolvedValue(new Set([9]));

      const result = await service.getRecentScreenings({ cinemaId: 5 });

      expect(result).toEqual([
        {
          movie: { id: 9, slug: 'a' },
          // 23:30 wall clock stays on the 20th; a Warsaw-zone conversion
          // would have moved it to the 21st.
          lastScreeningDate: '2026-09-20',
          screeningsCount: 4,
          hasUpcomingScreenings: true,
        },
        {
          movie: { id: 7, slug: 'b' },
          lastScreeningDate: '2026-08-02',
          screeningsCount: 1,
          hasUpcomingScreenings: false,
        },
      ]);
    });

    it('should drop rows whose movie no longer exists', async () => {
      repo.findRecentMovieStats.mockResolvedValue([
        {
          movieId: 9,
          lastScreeningDate: new Date('2026-09-20T19:00:00.000Z'),
          screeningsCount: 2,
        },
      ]);
      repo.findMovieSummariesByIds.mockResolvedValue([]);
      repo.findMovieIdsWithScreeningsBetween.mockResolvedValue(new Set());

      const result = await service.getRecentScreenings({ cinemaId: 5 });

      expect(result).toEqual([]);
    });

    it('should collapse duplicate movie rows and still honour the limit', async () => {
      // Two rows for the same film (as the scraper sometimes creates) come
      // back as separate stats with identical dates and counts.
      const date = new Date('2026-09-20T19:00:00.000Z');
      repo.findRecentMovieStats.mockResolvedValue([
        { movieId: 984, lastScreeningDate: date, screeningsCount: 7 },
        { movieId: 985, lastScreeningDate: date, screeningsCount: 7 },
        { movieId: 3, lastScreeningDate: date, screeningsCount: 2 },
        { movieId: 4, lastScreeningDate: date, screeningsCount: 1 },
      ]);
      repo.findMovieSummariesByIds.mockResolvedValue([
        { id: 984, slug: 'zmierzch', title: 'Zmierzch', productionYear: 2011 },
        {
          id: 985,
          slug: 'zmierzch-2',
          title: 'Zmierzch ',
          productionYear: 2011,
        },
        { id: 3, slug: 'kes', title: 'Kes', productionYear: 1969 },
        { id: 4, slug: 'pi', title: 'Pi', productionYear: 1998 },
      ] as any);
      repo.findMovieIdsWithScreeningsBetween.mockResolvedValue(new Set());

      const result = await service.getRecentScreenings({
        citySlug: 'warszawa',
        limit: 2,
      });

      expect(result.map((r) => r.movie.id)).toEqual([984, 3]);
    });
  });

  describe('getProgrammeProfile', () => {
    const now = new Date('2026-10-30T12:00:00.000Z');

    it('should count every past screening without a date range', async () => {
      repo.findProfileData.mockResolvedValue(null);

      const result = await service.getProgrammeProfile({
        directorSlug: 'andrzej-wajda',
      });

      expect(repo.findProfileData).toHaveBeenCalledWith({
        directorSlug: 'andrzej-wajda',
        since: undefined,
        until: now,
      });
      expect(result.screenings).toBe(0);
      expect(result.byMonth).toEqual([]);
    });

    it('should narrow the profile to whole Polish days from and to', async () => {
      repo.findProfileData.mockResolvedValue(null);

      await service.getProgrammeProfile({
        directorSlug: 'andrzej-wajda',
        from: '2026-03-01',
        to: '2026-06-30',
      });

      expect(repo.findProfileData).toHaveBeenCalledWith({
        directorSlug: 'andrzej-wajda',
        since: new Date('2026-03-01T00:00:00.000Z'),
        until: new Date('2026-07-01T00:00:00.000Z'),
      });
    });

    it('should never count beyond now when to is in the future', async () => {
      repo.findProfileData.mockResolvedValue(null);

      await service.getProgrammeProfile({
        directorSlug: 'andrzej-wajda',
        to: '2026-12-31',
      });

      expect(repo.findProfileData).toHaveBeenCalledWith(
        expect.objectContaining({ until: now }),
      );
    });

    it('should list every city with allCities', async () => {
      repo.findProfileData.mockResolvedValue({
        rows: Array.from({ length: 7 }, (_, i) => ({
          date: new Date('2026-04-01T18:00:00.000Z'),
          movieId: 1,
          cinemaId: i + 1,
          isDubbing: false,
        })),
        movies: [
          { id: 1, slug: 'brzezina', title: 'Brzezina', productionYear: 1970 },
        ],
        genres: [],
        directors: [],
        cinemas: Array.from({ length: 7 }, (_, i) => ({
          sourceId: i + 1,
          slug: `kino-${i + 1}`,
          name: `Kino ${i + 1}`,
          citySlug: `miasto-${i + 1}`,
          cityName: `Miasto ${i + 1}`,
        })),
      });

      const top = await service.getProgrammeProfile({ directorSlug: 'x' });
      const all = await service.getProgrammeProfile({
        directorSlug: 'x',
        allCities: true,
      });

      expect(top.topCities).toHaveLength(5);
      expect(all.topCities).toHaveLength(7);
      expect(repo.findProfileData).not.toHaveBeenCalledWith(
        expect.objectContaining({ allCities: true }),
      );
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
      repo.findMovieWithScreeningsById.mockResolvedValue(undefined);

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
      repo.findMovieWithScreeningsById.mockResolvedValue(movieData as any);
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
        type: 'regular',
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

      const result = await service.createScreening(dto);

      expect(result).toEqual(created);
      expect(repo.insert).toHaveBeenCalledWith(dto);
      expect(indexNowService.notifyContentChanged).toHaveBeenCalledTimes(1);
    });
  });
});
