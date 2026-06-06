import { Injectable } from '@nestjs/common';
import { SitemapRepository, type SitemapRow } from './sitemap.repository';
import type { SitemapEntry, SitemapResponse } from './sitemap.types';

// Omit updatedAt rather than send an unreliable value; the frontend
// skips lastModified entirely when the field is absent.
const toEntry = ({ slug, updatedAt }: SitemapRow): SitemapEntry => ({
  slug,
  ...(updatedAt && { updatedAt: updatedAt.toISOString() }),
});

@Injectable()
export class SitemapService {
  constructor(private readonly repo: SitemapRepository) {}

  // === READ ===

  async getSitemap(): Promise<SitemapResponse> {
    const [movies, cinemas, cities, genres] = await Promise.all([
      this.repo.findMovieEntries(),
      this.repo.findCinemaEntries(),
      this.repo.findCityEntriesWithCinemas(),
      this.repo.findGenreEntries(),
    ]);

    return {
      movies: movies.map(toEntry),
      cinemas: cinemas.map(toEntry),
      cities: cities.map(toEntry),
      genres: genres.map(toEntry),
    };
  }
}
