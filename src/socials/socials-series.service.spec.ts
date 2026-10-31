import { Test } from '@nestjs/testing';
import { SocialsSeriesService } from './socials-series.service';
import { SocialsSeriesRepository } from './socials-series.repository';

jest.mock('../lib/date', () => ({
  getTodayInPoland: jest.fn(() => '2026-11-02'),
  getDatePlusDays: jest.fn((d: string, n: number) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, day) + n * 86400000)
      .toISOString()
      .slice(0, 10);
  }),
  toDateOnlyString: jest.fn((d: string) => d.slice(0, 10)),
}));

const movie = (id: number, productionYear: number) => ({
  id,
  slug: `m-${id}`,
  title: `Movie ${id}`,
  titleOriginal: `Movie ${id}`,
  productionYear,
  description: '',
  duration: null,
  posterUrl: null,
  backdropUrl: null,
});

const cinema = (id: number, cityId: number, lat: number | null) => ({
  id,
  name: `Cinema ${id}`,
  slug: `c-${id}`,
  latitude: lat,
  longitude: lat === null ? null : lat / 2,
  cityId,
  cityName: `City ${cityId}`,
  citySlug: `city-${cityId}`,
  cityNameDeclinated: `City ${cityId}`,
});

describe('SocialsSeriesService', () => {
  let service: SocialsSeriesService;
  let repo: jest.Mocked<SocialsSeriesRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SocialsSeriesService,
        {
          provide: SocialsSeriesRepository,
          useValue: {
            findClassicScreenings: jest.fn(),
            findDirectorScreenings: jest.fn(),
            findMoviesByIds: jest.fn(),
            findCinemasByIds: jest.fn(),
            findDirectorsByIds: jest.fn(),
            findSeriesPosts: jest.fn(),
            insertSeriesPost: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SocialsSeriesService);
    repo = module.get(SocialsSeriesRepository);
  });

  describe('getMonthStats', () => {
    beforeEach(() => {
      // Movie 1: 3 screenings in two cities; movie 2: 1 screening.
      repo.findClassicScreenings.mockResolvedValue([
        { movieId: 1, cinemaId: 10 },
        { movieId: 1, cinemaId: 10 },
        { movieId: 1, cinemaId: 20 },
        { movieId: 2, cinemaId: 30 },
      ]);
      repo.findCinemasByIds.mockResolvedValue([
        cinema(10, 1, 52),
        cinema(20, 2, 50),
        cinema(30, 1, 54),
      ]);
      repo.findMoviesByIds.mockResolvedValue([movie(1, 1980), movie(2, 1920)]);
      repo.findSeriesPosts.mockResolvedValue([]);
    });

    it('aggregates screenings, cinemas, cities and the top and oldest movie', async () => {
      const stats = await service.getMonthStats('2026-10');

      expect(repo.findClassicScreenings).toHaveBeenCalledWith(
        new Date('2026-10-01T00:00:00Z'),
        new Date('2026-11-01T00:00:00Z'),
      );
      expect(stats.screenings).toBe(4);
      expect(stats.cinemas).toBe(3);
      expect(stats.cities).toBe(2);
      expect(stats.topMovie).toEqual({
        movie: movie(1, 1980),
        screenings: 3,
        cities: 2,
      });
      expect(stats.oldestMovie?.id).toBe(2);
      expect(stats.highlights.map((m) => m.id)).toEqual([1, 2]);
      expect(stats.alreadyPublished).toBe(false);
    });

    it('ranks cities and places them at the mean of their cinemas', async () => {
      const stats = await service.getMonthStats('2026-10');

      expect(stats.byCity[0]).toEqual({
        name: 'City 1',
        slug: 'city-1',
        count: 3,
        lat: 53,
        lon: 26.5,
      });
      expect(stats.byCity[1]).toMatchObject({ name: 'City 2', count: 1 });
      expect(stats.topCinemas[0]).toEqual({
        name: 'Cinema 10',
        slug: 'c-10',
        city: 'City 1',
        count: 2,
      });
    });

    it('ranks studio cinemas only, ties by name', async () => {
      repo.findClassicScreenings.mockResolvedValue([
        { movieId: 1, cinemaId: 40 },
        { movieId: 1, cinemaId: 40 },
        { movieId: 1, cinemaId: 30 },
        { movieId: 1, cinemaId: 10 },
      ]);
      repo.findCinemasByIds.mockResolvedValue([
        cinema(10, 1, 52),
        cinema(30, 1, 54),
        { ...cinema(40, 2, 50), name: 'Cinema City Bonarka' },
      ]);

      const stats = await service.getMonthStats('2026-10');

      expect(stats.cinemas).toBe(3);
      expect(stats.topCinemas.map((c) => c.slug)).toEqual(['c-10', 'c-30']);
    });

    it('flags a month that was already published', async () => {
      repo.findSeriesPosts.mockResolvedValue([
        { postDate: '2026-11-01', reason: 'SERIES:stats:2026-10' },
      ]);

      expect((await service.getMonthStats('2026-10')).alreadyPublished).toBe(
        true,
      );
    });

    it('handles a month without screenings', async () => {
      repo.findClassicScreenings.mockResolvedValue([]);
      repo.findCinemasByIds.mockResolvedValue([]);
      repo.findMoviesByIds.mockResolvedValue([]);

      const stats = await service.getMonthStats('2026-10');

      expect(stats.screenings).toBe(0);
      expect(stats.topMovie).toBeNull();
      expect(stats.oldestMovie).toBeNull();
    });
  });

  describe('getRetrospectives', () => {
    const screening = (
      movieId: number,
      directorId: number,
      date: string,
      cityId: number,
    ) => ({
      movieId,
      directorId,
      date: new Date(date),
      cityId,
    });

    beforeEach(() => {
      repo.findDirectorScreenings.mockResolvedValue([
        // Director 7: three films, one of them in two cities.
        screening(1, 7, '2026-11-10T18:00:00Z', 1),
        screening(1, 7, '2026-11-05T18:00:00Z', 2),
        screening(2, 7, '2026-11-12T18:00:00Z', 1),
        screening(3, 7, '2026-11-20T18:00:00Z', 3),
        // Director 8: two films only.
        screening(4, 8, '2026-11-10T18:00:00Z', 1),
        screening(5, 8, '2026-11-11T18:00:00Z', 1),
      ]);
      repo.findDirectorsByIds.mockResolvedValue([
        { id: 7, name: 'Kubrick', slug: 'kubrick', photoUrl: null },
      ]);
      repo.findMoviesByIds.mockResolvedValue([
        movie(1, 1968),
        movie(2, 1971),
        movie(3, 1980),
      ]);
      repo.findSeriesPosts.mockResolvedValue([]);
    });

    it('returns directors with enough films, films sorted by first screening', async () => {
      const result = await service.getRetrospectives(
        '2026-11-02',
        '2026-11-30',
        3,
      );

      expect(result.retrospectives).toHaveLength(1);
      const [retro] = result.retrospectives;
      expect(retro.director.name).toBe('Kubrick');
      expect(retro.films).toEqual([
        { movie: movie(1, 1968), from: '2026-11-05', cities: 2 },
        { movie: movie(2, 1971), from: '2026-11-12', cities: 1 },
        { movie: movie(3, 1980), from: '2026-11-20', cities: 1 },
      ]);
    });

    it('skips a director featured within the cooldown', async () => {
      repo.findSeriesPosts.mockResolvedValue([
        { postDate: '2026-10-01', reason: 'SERIES:retrospective:7' },
      ]);

      const result = await service.getRetrospectives(
        '2026-11-02',
        '2026-11-30',
        3,
      );

      expect(result.retrospectives).toEqual([]);
      expect(repo.findSeriesPosts).toHaveBeenCalledWith(
        'retrospective',
        '2026-08-04',
      );
    });
  });

  it('records a published series post', async () => {
    await service.recordSeriesPost('retrospective', '7', 'instagram_carousel');

    expect(repo.insertSeriesPost).toHaveBeenCalledWith({
      postDate: '2026-11-02',
      platform: 'instagram_carousel',
      contentType: 'retrospective',
      reason: 'SERIES:retrospective:7',
    });
  });
});
