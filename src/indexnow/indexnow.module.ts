import { Module } from '@nestjs/common';
import { SitemapModule } from '../sitemap/sitemap.module';
import { IndexNowService } from './indexnow.service';

@Module({
  imports: [SitemapModule],
  providers: [IndexNowService],
  exports: [IndexNowService],
})
export class IndexNowModule {}
