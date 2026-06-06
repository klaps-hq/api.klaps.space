import { Test } from '@nestjs/testing';
import { SitemapService } from './sitemap.service';
import { SitemapRepository } from './sitemap.repository';

const updatedAt = new Date('2024-01-01T00:00:00.000Z');

describe('SitemapService', () => {
  let service: SitemapService;
  let repo: jest.Mocked<SitemapRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SitemapService,
        {
          provide: SitemapRepository,
          useValue: {
            findMovieEntries: jest.fn(),
            findCinemaEntries: jest.fn(),
            findCityEntriesWithCinemas: jest.fn(),
            findGenreEntries: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SitemapService);
    repo = module.get(SitemapRepository);
  });

  describe('getSitemap', () => {
    it('should map rows to entries with ISO updatedAt', async () => {
      repo.findMovieEntries.mockResolvedValue([
        { slug: 'pan-tadeusz-1999', updatedAt },
      ]);
      repo.findCinemaEntries.mockResolvedValue([
        { slug: 'kino-muranow', updatedAt },
      ]);
      repo.findCityEntriesWithCinemas.mockResolvedValue([{ slug: 'warszawa' }]);
      repo.findGenreEntries.mockResolvedValue([{ slug: 'dramat', updatedAt }]);

      const result = await service.getSitemap();

      expect(result).toEqual({
        movies: [
          { slug: 'pan-tadeusz-1999', updatedAt: '2024-01-01T00:00:00.000Z' },
        ],
        cinemas: [
          { slug: 'kino-muranow', updatedAt: '2024-01-01T00:00:00.000Z' },
        ],
        cities: [{ slug: 'warszawa' }],
        genres: [{ slug: 'dramat', updatedAt: '2024-01-01T00:00:00.000Z' }],
      });
    });

    it('should omit updatedAt when the row has none', async () => {
      repo.findMovieEntries.mockResolvedValue([{ slug: 'no-date' }]);
      repo.findCinemaEntries.mockResolvedValue([]);
      repo.findCityEntriesWithCinemas.mockResolvedValue([]);
      repo.findGenreEntries.mockResolvedValue([]);

      const result = await service.getSitemap();

      expect(result.movies).toEqual([{ slug: 'no-date' }]);
      expect(result.movies[0]).not.toHaveProperty('updatedAt');
    });

    it('should return empty arrays when repository has no rows', async () => {
      repo.findMovieEntries.mockResolvedValue([]);
      repo.findCinemaEntries.mockResolvedValue([]);
      repo.findCityEntriesWithCinemas.mockResolvedValue([]);
      repo.findGenreEntries.mockResolvedValue([]);

      const result = await service.getSitemap();

      expect(result).toEqual({
        movies: [],
        cinemas: [],
        cities: [],
        genres: [],
      });
    });
  });
});
