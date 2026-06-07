import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IndexNowService } from './indexnow.service';
import { SitemapService } from '../sitemap/sitemap.service';

const FRONTEND_URL = 'https://klaps.space';
const KEY = 'test-indexnow-key';

describe('IndexNowService', () => {
  let service: IndexNowService;
  let sitemapService: jest.Mocked<SitemapService>;
  let config: Record<string, string | undefined>;
  let fetchMock: jest.Mock;

  const createService = async () => {
    const module = await Test.createTestingModule({
      providers: [
        IndexNowService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => config[key]) },
        },
        {
          provide: SitemapService,
          useValue: { getSitemap: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(IndexNowService);
    sitemapService = module.get(SitemapService);
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    config = { INDEXNOW_KEY: KEY, FRONTEND_URL };
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;
    await createService();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should be a no-op when INDEXNOW_KEY is not configured', () => {
    config = { FRONTEND_URL };

    service.notifyContentChanged();
    jest.runAllTimers();

    expect(sitemapService.getSitemap).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should debounce multiple writes into a single submission', async () => {
    sitemapService.getSitemap.mockResolvedValue({
      movies: [],
      cinemas: [],
      cities: [],
      genres: [],
    });

    service.notifyContentChanged();
    service.notifyContentChanged();
    service.notifyContentChanged();

    await jest.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should submit changed URLs with key, keyLocation and host', async () => {
    const recent = new Date().toISOString();
    const stale = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    sitemapService.getSitemap.mockResolvedValue({
      movies: [
        { slug: 'nowy-film', updatedAt: recent },
        { slug: 'stary-film', updatedAt: stale },
        { slug: 'bez-daty' },
      ],
      cinemas: [{ slug: 'kino-pod-baranami', updatedAt: recent }],
      cities: [{ slug: 'krakow', updatedAt: recent }],
      genres: [{ slug: 'dramat', updatedAt: stale }],
    });

    service.notifyContentChanged();
    await jest.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://api.indexnow.org/indexnow');

    const body = JSON.parse(init.body);
    expect(body.host).toBe('klaps.space');
    expect(body.key).toBe(KEY);
    expect(body.keyLocation).toBe(`${FRONTEND_URL}/indexnow-key.txt`);
    expect(body.urlList).toEqual([
      FRONTEND_URL,
      `${FRONTEND_URL}/seanse`,
      `${FRONTEND_URL}/filmy/nowy-film`,
      `${FRONTEND_URL}/kina/kino-pod-baranami`,
      `${FRONTEND_URL}/miasta/krakow`,
    ]);
  });

  it('should swallow submission errors and not throw', async () => {
    sitemapService.getSitemap.mockRejectedValue(new Error('db down'));

    service.notifyContentChanged();

    await expect(jest.runAllTimersAsync()).resolves.not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
