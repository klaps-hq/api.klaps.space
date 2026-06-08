import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';

const mockSitemapResponse = {
  movies: [{ slug: 'incepcja', updatedAt: '2026-06-01T12:00:00.000Z' }],
  cinemas: [{ slug: 'kino-muranow', updatedAt: '2026-06-01T12:00:00.000Z' }],
  cities: [{ slug: 'warszawa', updatedAt: '2026-06-01T12:00:00.000Z' }],
  genres: [{ slug: 'dramat', updatedAt: '2026-06-01T12:00:00.000Z' }],
  directors: [
    { slug: 'pawel-pawlikowski', updatedAt: '2026-06-01T12:00:00.000Z' },
  ],
};

describe('SitemapController', () => {
  let controller: SitemapController;
  let service: jest.Mocked<SitemapService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SitemapController],
      providers: [
        {
          provide: SitemapService,
          useValue: {
            getSitemap: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(SitemapController);
    service = module.get(SitemapService);
  });

  describe('getSitemap', () => {
    it('should return sitemap data from service', async () => {
      service.getSitemap.mockResolvedValue(mockSitemapResponse);

      const result = await controller.getSitemap();

      expect(result).toEqual(mockSitemapResponse);
      expect(service.getSitemap).toHaveBeenCalled();
    });
  });
});
