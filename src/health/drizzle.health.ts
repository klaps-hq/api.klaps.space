import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/constants';

@Injectable()
export class DrizzleHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database,
  ) {
    super();
  }

  async isHealthy(key = 'database'): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
