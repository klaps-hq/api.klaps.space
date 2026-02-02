import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { DRIZZLE } from './constants';
import * as schema from './schema';
import { Pool } from 'pg';

/**
 * Global module that provides a Drizzle ORM instance (PostgreSQL).
 * Inject with @Inject(DRIZZLE) in your services.
 */
@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString =
          configService.getOrThrow<string>('DATABASE_URL');
        const pool = new Pool({ connectionString });
        return drizzle(connectionString, { schema, mode: 'default' });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
