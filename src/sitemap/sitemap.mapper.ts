import type { SitemapEntry } from './sitemap.types';

export const mapSitemapEntry = (row: {
  slug: string;
  updatedAt: Date | null;
}): SitemapEntry => ({
  slug: row.slug,
  ...(row.updatedAt && { updatedAt: row.updatedAt.toISOString() }),
});
