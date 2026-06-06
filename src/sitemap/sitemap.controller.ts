import { Controller, Get, UseGuards } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { SitemapResponse } from './sitemap.types';

@Controller('sitemap')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getSitemap(): Promise<SitemapResponse> {
    return this.sitemapService.getSitemap();
  }
}
