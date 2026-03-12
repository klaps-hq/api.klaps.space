import { Test } from '@nestjs/testing';
import { ShowtimesService } from './showtimes.service';
import { ShowtimesRepository } from './showtimes.repository';
import { CitiesService } from '../cities/cities.service';
import { getDateRangeUpToMonthFromNow } from '../lib/date';

describe('ShowtimesService', () => {
  let service: ShowtimesService;
  let repo: jest.Mocked<ShowtimesRepository>;
  let citiesService: jest.Mocked<CitiesService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ShowtimesService,
        {
          provide: ShowtimesRepository,
          useValue: {
            findAll: jest.fn(),
            upsertBatch: jest.fn(),
            updateCitiesLastScrapedAt: jest.fn(),
          },
        },
        {
          provide: CitiesService,
          useValue: {
            findBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ShowtimesService);
    repo = module.get(ShowtimesRepository);
    citiesService = module.get(CitiesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getShowtimes', () => {
    it('should query with dateFrom, dateTo and cityId', async () => {
      const showtimes = [
        {
          id: 1,
          url: 'https://kino.pl/1',
          cityId: 3,
          date: '2025-01-15',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          url: 'https://kino.pl/2',
          cityId: 3,
          date: '2025-01-16',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      repo.findAll.mockResolvedValue(
        showtimes.map((s) => ({ ...s, date: new Date(s.date) })),
      );

      const result = await service.getShowtimes({
        dateFrom: '2025-01-10',
        dateTo: '2025-01-20',
        cityId: 3,
      } as any);

      expect(result).toEqual([
        {
          id: 1,
          url: 'https://kino.pl/1',
          cityId: 3,
          date: '2025-01-15' as any,
        },
        {
          id: 2,
          url: 'https://kino.pl/2',
          cityId: 3,
          date: '2025-01-16' as any,
        },
      ]);
      const { startDay, endDay } = getDateRangeUpToMonthFromNow(
        '2025-01-10',
        '2025-01-20',
      );
      expect(repo.findAll).toHaveBeenCalledWith(startDay, endDay, 3);
      expect(citiesService.findBySlug).not.toHaveBeenCalled();
    });

    it('should resolve cityId via citiesService when citySlug provided', async () => {
      citiesService.findBySlug.mockResolvedValue({
        id: 7,
        slug: 'gdansk',
      } as any);
      repo.findAll.mockResolvedValue([]);

      await service.getShowtimes({
        dateFrom: '2025-01-10',
        dateTo: '2025-01-20',
        citySlug: 'gdansk',
      } as any);

      const { startDay, endDay } = getDateRangeUpToMonthFromNow(
        '2025-01-10',
        '2025-01-20',
      );
      expect(citiesService.findBySlug).toHaveBeenCalledWith('gdansk');
      expect(repo.findAll).toHaveBeenCalledWith(startDay, endDay, 7);
    });

    it('should pass undefined cityId when neither cityId nor citySlug provided', async () => {
      repo.findAll.mockResolvedValue([]);

      await service.getShowtimes({
        dateFrom: '2025-02-01',
        dateTo: '2025-02-28',
      } as any);

      const { startDay, endDay } = getDateRangeUpToMonthFromNow(
        '2025-02-01',
        '2025-02-28',
      );
      expect(repo.findAll).toHaveBeenCalledWith(startDay, endDay, undefined);
    });

    it('should use current date range when dateFrom/dateTo are not provided', async () => {
      repo.findAll.mockResolvedValue([]);

      await service.getShowtimes({} as any);

      const [startDay, endDay] = repo.findAll.mock.calls[0];
      expect(startDay).toBeInstanceOf(Date);
      expect(endDay).toBeInstanceOf(Date);
      expect(endDay.getTime()).toBeGreaterThan(startDay.getTime());
    });

    it('should return undefined cityId when citySlug resolves to no city', async () => {
      citiesService.findBySlug.mockResolvedValue(null);
      repo.findAll.mockResolvedValue([]);

      await service.getShowtimes({ citySlug: 'nonexistent' } as any);

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        undefined,
      );
    });
  });

  describe('createShowtimesBatch', () => {
    it('should return early when showtimes array is empty', async () => {
      await service.createShowtimesBatch({
        showtimes: [],
        scrapedCityIds: [1],
      } as any);

      expect(repo.upsertBatch).not.toHaveBeenCalled();
      expect(repo.updateCitiesLastScrapedAt).not.toHaveBeenCalled();
    });

    it('should call upsertBatch with showtimes', async () => {
      const showtimes = [
        { url: 'https://kino.pl/1', cityId: 3, date: '2025-01-15' },
        { url: 'https://kino.pl/2', cityId: 3, date: '2025-01-16' },
      ];
      repo.upsertBatch.mockResolvedValue(undefined);

      await service.createShowtimesBatch({
        showtimes,
        scrapedCityIds: undefined,
      } as any);

      expect(repo.upsertBatch).toHaveBeenCalledWith(showtimes);
      expect(repo.updateCitiesLastScrapedAt).not.toHaveBeenCalled();
    });

    it('should update cities lastScrapedAt when scrapedCityIds provided', async () => {
      const showtimes = [
        { url: 'https://kino.pl/1', cityId: 3, date: '2025-01-15' },
      ];
      repo.upsertBatch.mockResolvedValue(undefined);
      repo.updateCitiesLastScrapedAt.mockResolvedValue(undefined);

      await service.createShowtimesBatch({
        showtimes,
        scrapedCityIds: [3, 5],
      } as any);

      expect(repo.upsertBatch).toHaveBeenCalledWith(showtimes);
      expect(repo.updateCitiesLastScrapedAt).toHaveBeenCalledWith([3, 5]);
    });

    it('should not update cities when scrapedCityIds is empty array', async () => {
      const showtimes = [
        { url: 'https://kino.pl/1', cityId: 3, date: '2025-01-15' },
      ];
      repo.upsertBatch.mockResolvedValue(undefined);

      await service.createShowtimesBatch({
        showtimes,
        scrapedCityIds: [],
      } as any);

      expect(repo.upsertBatch).toHaveBeenCalledWith(showtimes);
      expect(repo.updateCitiesLastScrapedAt).not.toHaveBeenCalled();
    });
  });
});
