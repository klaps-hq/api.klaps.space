import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { DRIZZLE } from './constants';
import * as schema from './schema/schema';
import * as relations from './schema/relations';

/**
 * Global module that provides a Drizzle ORM instance (MySQL).
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
          mode: 'default',
        });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
