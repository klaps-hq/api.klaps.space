import { Controller, Get, UseGuards } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { SitemapResponse } from './sitemap.types';

@Controller('sitemap')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  /**
   * Lightweight payload for the frontend sitemap.xml: slugs plus
   * updatedAt for every indexable resource in a single request.
   */
  @Get()
  @UseGuards(InternalApiKeyGuard)
  getSitemap(): Promise<SitemapResponse> {
    return this.sitemapService.getSitemap();
  }
}
