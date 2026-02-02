import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from './database/schema';
import { DRIZZLE } from './database/constants';

@Injectable()
export class AppService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }
}
