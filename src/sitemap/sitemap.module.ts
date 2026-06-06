import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';
import { SitemapRepository } from './sitemap.repository';

@Module({
  controllers: [SitemapController],
  providers: [SitemapService, SitemapRepository],
})
export class SitemapModule {}
