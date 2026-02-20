import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL!,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  logger.log(`Server is running on port ${port}`);
}
bootstrap();
