/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Params } from 'nestjs-pino';

const hasPinoPretty = (() => {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
})();

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): Params => {
        const isProduction = config.get('NODE_ENV') === 'production';
        const logLevel = config.get(
          'LOG_LEVEL',
          isProduction ? 'info' : 'debug',
        );

        const targets: Array<{
          target: string;
          level: string;
          options: Record<string, unknown>;
        }> = [];

        if (!isProduction && hasPinoPretty) {
          targets.push({
            target: 'pino-pretty',
            level: logLevel,
            options: { colorize: true, singleLine: true },
          });
        } else {
          targets.push({
            target: 'pino/file',
            level: logLevel,
            options: { destination: 1 },
          });
        }

        const logFile = config.get<string>('LOG_FILE');
        if (logFile) {
          targets.push({
            target: 'pino/file',
            level: logLevel,
            options: { destination: logFile, mkdir: true },
          });
        }

        return {
          pinoHttp: {
            level: logLevel,
            transport: { targets },
            redact: [
              'req.headers.authorization',
              'req.headers["x-api-key"]',
              'req.headers["x-internal-api-key"]',
            ],
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
                remoteAddress: req.remoteAddress,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },
          },
        };
      },
    }),
  ],
})
export class AppLoggerModule {}
