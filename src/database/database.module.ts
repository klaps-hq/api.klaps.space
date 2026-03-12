import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
      useFactory: (configService: ConfigService) => {
        const connectionString =
          configService.getOrThrow<string>('DATABASE_URL');
        return drizzle(connectionString, {
          schema: { ...schema, ...relations },
        });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
