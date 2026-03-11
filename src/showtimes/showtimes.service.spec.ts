import { Test } from '@nestjs/testing';
import { ShowtimesService } from './showtimes.service';
import { ShowtimesRepository } from './showtimes.repository';
import { CitiesService } from '../cities/cities.service';

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
            findShowtimes: jest.fn(),
            insertBatch: jest.fn(),
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
          date: new Date('2025-01-15'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          url: 'https://kino.pl/2',
          cityId: 3,
          date: new Date('2025-01-16'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      repo.findShowtimes.mockResolvedValue(showtimes);

      const result = await service.getShowtimes({
        dateFrom: '2025-01-10',
        dateTo: '2025-01-20',
        cityId: 3,
      } as any);

      expect(result).toEqual(showtimes);
      expect(repo.findShowtimes).toHaveBeenCalledWith(
        new Date('2025-01-10'),
        new Date('2025-01-20'),
        3,
      );
      expect(citiesService.findBySlug).not.toHaveBeenCalled();
    });

    it('should resolve cityId via citiesService when citySlug provided', async () => {
      citiesService.findBySlug.mockResolvedValue({
        id: 7,
        slug: 'gdansk',
      } as any);
      repo.findShowtimes.mockResolvedValue([]);

      await service.getShowtimes({
        dateFrom: '2025-01-10',
        dateTo: '2025-01-20',
        citySlug: 'gdansk',
      } as any);

      expect(citiesService.findBySlug).toHaveBeenCalledWith('gdansk');
      expect(repo.findShowtimes).toHaveBeenCalledWith(
        new Date('2025-01-10'),
        new Date('2025-01-20'),
        7,
      );
    });

    it('should pass undefined cityId when neither cityId nor citySlug provided', async () => {
      repo.findShowtimes.mockResolvedValue([]);

      await service.getShowtimes({
        dateFrom: '2025-02-01',
        dateTo: '2025-02-28',
      } as any);

      expect(repo.findShowtimes).toHaveBeenCalledWith(
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        undefined,
      );
    });

    it('should use new Date() when dateFrom/dateTo are not provided', async () => {
      repo.findShowtimes.mockResolvedValue([]);
      const before = new Date();

      await service.getShowtimes({} as any);

      const [startDay, endDay] = repo.findShowtimes.mock.calls[0];
      expect(startDay.getTime()).toBeGreaterThanOrEqual(before.getTime() - 100);
      expect(endDay.getTime()).toBeGreaterThanOrEqual(before.getTime() - 100);
    });

    it('should return undefined cityId when citySlug resolves to no city', async () => {
      citiesService.findBySlug.mockResolvedValue(null);
      repo.findShowtimes.mockResolvedValue([]);

      await service.getShowtimes({ citySlug: 'nonexistent' } as any);

      expect(repo.findShowtimes).toHaveBeenCalledWith(
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

      expect(repo.insertBatch).not.toHaveBeenCalled();
      expect(repo.updateCitiesLastScrapedAt).not.toHaveBeenCalled();
    });

    it('should call insertBatch with showtimes', async () => {
      const showtimes = [
        { url: 'https://kino.pl/1', cityId: 3, date: '2025-01-15' },
        { url: 'https://kino.pl/2', cityId: 3, date: '2025-01-16' },
      ];
      repo.insertBatch.mockResolvedValue(undefined);

      await service.createShowtimesBatch({
        showtimes,
        scrapedCityIds: undefined,
      } as any);

      expect(repo.insertBatch).toHaveBeenCalledWith(showtimes);
      expect(repo.updateCitiesLastScrapedAt).not.toHaveBeenCalled();
    });

    it('should update cities lastScrapedAt when scrapedCityIds provided', async () => {
      const showtimes = [
        { url: 'https://kino.pl/1', cityId: 3, date: '2025-01-15' },
      ];
      repo.insertBatch.mockResolvedValue(undefined);
      repo.updateCitiesLastScrapedAt.mockResolvedValue(undefined);

      await service.createShowtimesBatch({
        showtimes,
        scrapedCityIds: [3, 5],
      } as any);

      expect(repo.insertBatch).toHaveBeenCalledWith(showtimes);
      expect(repo.updateCitiesLastScrapedAt).toHaveBeenCalledWith([3, 5]);
    });

    it('should not update cities when scrapedCityIds is empty array', async () => {
      const showtimes = [
        { url: 'https://kino.pl/1', cityId: 3, date: '2025-01-15' },
      ];
      repo.insertBatch.mockResolvedValue(undefined);

      await service.createShowtimesBatch({
        showtimes,
        scrapedCityIds: [],
      } as any);

      expect(repo.insertBatch).toHaveBeenCalledWith(showtimes);
      expect(repo.updateCitiesLastScrapedAt).not.toHaveBeenCalled();
    });
  });
});
