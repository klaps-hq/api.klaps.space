import { Injectable } from '@nestjs/common';
import type { SitemapResponse } from './sitemap.types';
import { mapSitemapEntry } from './sitemap.mapper';
import { SitemapRepository } from './sitemap.repository';

@Injectable()
export class SitemapService {
  constructor(private readonly repo: SitemapRepository) {}

  // === READ ===

  async getSitemap(): Promise<SitemapResponse> {
    const [movies, cinemas, cities, genres, directors] = await Promise.all([
      this.repo.findMovieEntries(),
      this.repo.findCinemaEntries(),
      this.repo.findCityEntries(),
      this.repo.findGenreEntries(),
      this.repo.findDirectorEntries(),
    ]);

    return {
      movies: movies.map(mapSitemapEntry),
      cinemas: cinemas.map(mapSitemapEntry),
      cities: cities.map(mapSitemapEntry),
      genres: genres.map(mapSitemapEntry),
      directors: directors.map(mapSitemapEntry),
    };
  }
}
