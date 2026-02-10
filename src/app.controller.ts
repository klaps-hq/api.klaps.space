import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * URL: /api/v1/health
   * Lightweight health check — no DB, no auth.
   */
  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
