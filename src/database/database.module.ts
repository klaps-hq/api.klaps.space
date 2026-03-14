import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from './constants';
import * as schema from './schemas';
import * as relations from './schemas/relations';

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
      useFactory: async (configService: ConfigService) => {
        const connectionString =
          configService.getOrThrow<string>('DATABASE_URL');
        const pool = new Pool({
          connectionString,
          connectionTimeoutMillis: 5000,
        });

        try {
          await pool.query('SELECT 1');
        } catch (error) {
          await pool.end();
          const logger = new Logger('DatabaseModule');
          logger.error(
            `Failed to connect to PostgreSQL: ${(error as Error).message}`,
          );
          throw error;
        }

        return drizzle(pool, {
          schema: { ...schema, ...relations },
        });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
