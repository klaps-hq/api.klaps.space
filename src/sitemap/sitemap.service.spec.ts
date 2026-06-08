import { Test } from '@nestjs/testing';
import { SitemapService } from './sitemap.service';
import { SitemapRepository } from './sitemap.repository';

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
            findMovieEntries: jest.fn().mockResolvedValue([]),
            findCinemaEntries: jest.fn().mockResolvedValue([]),
            findCityEntries: jest.fn().mockResolvedValue([]),
            findGenreEntries: jest.fn().mockResolvedValue([]),
            findDirectorEntries: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get(SitemapService);
    repo = module.get(SitemapRepository);
  });

  describe('getSitemap', () => {
    it('should return mapped entries for all resource types', async () => {
      const date = new Date('2026-06-01T12:00:00.000Z');
      repo.findMovieEntries.mockResolvedValue([
        { slug: 'incepcja', updatedAt: date },
      ]);
      repo.findCinemaEntries.mockResolvedValue([
        { slug: 'kino-muranow', updatedAt: date },
      ]);
      repo.findCityEntries.mockResolvedValue([
        { slug: 'warszawa', updatedAt: date },
      ]);
      repo.findGenreEntries.mockResolvedValue([
        { slug: 'dramat', updatedAt: date },
      ]);
      repo.findDirectorEntries.mockResolvedValue([
        { slug: 'pawel-pawlikowski', updatedAt: date },
      ]);

      const result = await service.getSitemap();

      expect(result).toEqual({
        movies: [{ slug: 'incepcja', updatedAt: '2026-06-01T12:00:00.000Z' }],
        cinemas: [
          { slug: 'kino-muranow', updatedAt: '2026-06-01T12:00:00.000Z' },
        ],
        cities: [{ slug: 'warszawa', updatedAt: '2026-06-01T12:00:00.000Z' }],
        genres: [{ slug: 'dramat', updatedAt: '2026-06-01T12:00:00.000Z' }],
        directors: [
          { slug: 'pawel-pawlikowski', updatedAt: '2026-06-01T12:00:00.000Z' },
        ],
      });
    });

    it('should omit updatedAt when null', async () => {
      repo.findGenreEntries.mockResolvedValue([
        { slug: 'horror', updatedAt: null },
      ]);

      const result = await service.getSitemap();

      expect(result.genres).toEqual([{ slug: 'horror' }]);
      expect(result.genres[0]).not.toHaveProperty('updatedAt');
    });

    it('should return empty arrays when no data exists', async () => {
      const result = await service.getSitemap();

      expect(result).toEqual({
        movies: [],
        cinemas: [],
        cities: [],
        genres: [],
        directors: [],
      });
    });
  });
});
