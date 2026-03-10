import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'express';

const DEFAULT_PORT = 5000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  app.use(json({ limit: '5mb' }));
  app.setGlobalPrefix('api/v1');

  app.use(helmet());
  app.use(compression());

  const frontendUrl = configService.get<string>('FRONTEND_URL');

  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is required in the .env file');
  }  

  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key'],
    credentials: !!frontendUrl,
  });

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
