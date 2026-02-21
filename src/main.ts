import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';

const DEFAULT_PORT = 5000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.use(helmet());
  app.use(compression());

  const frontendUrl = configService.get<string>('FRONTEND_URL');
  app.enableCors({
    origin: frontendUrl || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key'],
    credentials: !!frontendUrl,
  });

  if (!frontendUrl) {
    logger.warn('FRONTEND_URL is not set — CORS is open to all origins');
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? DEFAULT_PORT;
  await app.listen(port);
  logger.log(`Server is running on port ${port}`);
}
bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', err);
  process.exit(1);
});
