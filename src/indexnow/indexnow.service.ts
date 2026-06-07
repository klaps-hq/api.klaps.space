import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SitemapService } from '../sitemap/sitemap.service';
import type { SitemapEntry } from '../sitemap/sitemap.types';

/** Quiet window after the last data write before submitting. */
const DEBOUNCE_MS = 15 * 60 * 1000;
/** Upper bound so long scrape runs still trigger a submission. */
const MAX_DELAY_MS = 60 * 60 * 1000;
/** First submission after boot looks this far back for changed content. */
const INITIAL_LOOKBACK_MS = 24 * 60 * 60 * 1000;
/** IndexNow accepts up to 10k URLs per request. */
const MAX_URLS = 10_000;

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Pings IndexNow (Bing, Yandex, Seznam and others) with frontend URLs whose
 * content changed, so the daily repertoire updates get re-crawled quickly
 * instead of waiting for the next sitemap visit.
 *
 * Writes during a scrape run arrive one by one, so submissions are debounced:
 * a single batched ping fires after a quiet window. Disabled (no-op) unless
 * INDEXNOW_KEY and FRONTEND_URL are configured; the same key must be served
 * by the frontend at /indexnow-key.txt.
 */
@Injectable()
export class IndexNowService implements OnModuleDestroy {
  private readonly logger = new Logger(IndexNowService.name);

  private debounceTimer: NodeJS.Timeout | null = null;
  private firstPendingAt: number | null = null;
  private lastSubmittedAt: number | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly sitemapService: SitemapService,
  ) {}

  onModuleDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  /** Schedules a debounced IndexNow submission. Safe to call on every write. */
  notifyContentChanged(): void {
    if (!this.isEnabled()) return;

    const now = Date.now();
    this.firstPendingAt ??= now;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    // Wait for the quiet window, but never push the submission further
    // than MAX_DELAY_MS past the first pending write.
    const elapsed = now - this.firstPendingAt;
    const delay = Math.min(DEBOUNCE_MS, Math.max(0, MAX_DELAY_MS - elapsed));

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.firstPendingAt = null;
      void this.submitChangedUrls();
    }, delay);
    this.debounceTimer.unref();
  }

  // === PRIVATE ===

  private isEnabled(): boolean {
    return Boolean(
      this.configService.get<string>('INDEXNOW_KEY') &&
      this.configService.get<string>('FRONTEND_URL'),
    );
  }

  private async submitChangedUrls(): Promise<void> {
    try {
      const urls = await this.collectChangedUrls();
      await this.submit(urls);
      this.lastSubmittedAt = Date.now();
      this.logger.log(`Submitted ${urls.length} URLs to IndexNow`);
    } catch (error) {
      // Indexing pings are best-effort: log and move on, the next data
      // write reschedules a submission anyway.
      this.logger.warn(
        `IndexNow submission failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async collectChangedUrls(): Promise<string[]> {
    const siteUrl = this.getSiteUrl();
    const since = this.lastSubmittedAt ?? Date.now() - INITIAL_LOOKBACK_MS;
    const sitemap = await this.sitemapService.getSitemap();

    const changed = (entries: SitemapEntry[], basePath: string): string[] =>
      entries
        .filter((entry) => {
          if (!entry.updatedAt) return false;
          const updatedAt = Date.parse(entry.updatedAt);
          return !Number.isNaN(updatedAt) && updatedAt >= since;
        })
        .map(
          (entry) => `${siteUrl}/${basePath}/${encodeURIComponent(entry.slug)}`,
        );

    // The home page and the main listing change with every repertoire
    // update, so they always ride along.
    const urls = [
      siteUrl,
      `${siteUrl}/seanse`,
      ...changed(sitemap.movies, 'filmy'),
      ...changed(sitemap.cinemas, 'kina'),
      ...changed(sitemap.cities, 'miasta'),
      ...changed(sitemap.genres, 'gatunki'),
    ];

    return urls.slice(0, MAX_URLS);
  }

  private async submit(urlList: string[]): Promise<void> {
    const siteUrl = this.getSiteUrl();
    const key = this.configService.get<string>('INDEXNOW_KEY');

    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(siteUrl).host,
        key,
        keyLocation: `${siteUrl}/indexnow-key.txt`,
        urlList,
      }),
    });

    if (!response.ok) {
      throw new Error(`IndexNow responded with HTTP ${response.status}`);
    }
  }

  private getSiteUrl(): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? '';
    return frontendUrl.replace(/\/+$/, '');
  }
}
