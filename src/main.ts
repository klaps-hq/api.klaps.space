import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { json, Request, Response, NextFunction } from 'express';

const DEFAULT_PORT = 5000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(PinoLogger));

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  app.use(json({ limit: '5mb' }));
  app.setGlobalPrefix('api/v2');

  const helmetMiddleware = helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/reference' || req.path === '/openapi.json') {
      return next();
    }
    helmetMiddleware(req, res, next);
  });
  app.use(compression());

  const frontendUrl = configService.get<string>('FRONTEND_URL');

  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is required in the .env file');
  }

  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-API-Key'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Klaps API')
    .setDescription(
      'API for Klaps — Polish nationwide guide to special screenings, classic cinema, and retrospectives',
    )
    .setVersion('2.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-internal-api-key', in: 'header' },
      'internal-api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use('/openapi.json', (_req: Request, res: Response) => {
    res.json(document);
  });

  app.use(
    '/reference',
    apiReference({
      url: '/openapi.json',
      theme: 'purple',
      darkMode: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? DEFAULT_PORT;
  await app.listen(port);
  logger.log(`Server is running on port ${port}`);
  logger.log(`API Reference: http://localhost:${port}/reference`);
}
bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', err);
  process.exit(1);
});
