/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Params } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): Params => {
        const isProduction =
          process.env.NODE_ENV === 'production' ||
          config.get('NODE_ENV') === 'production';
        const logLevel = config.get(
          'LOG_LEVEL',
          isProduction ? 'info' : 'debug',
        );

        const targets: Array<{
          target: string;
          level: string;
          options: Record<string, unknown>;
        }> = [];

        if (isProduction) {
          targets.push({
            target: 'pino/file',
            level: logLevel,
            options: { destination: 1 },
          });
        } else {
          targets.push({
            target: 'pino-pretty',
            level: logLevel,
            options: { colorize: true, singleLine: true },
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
