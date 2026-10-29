import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DatabaseError } from 'pg';

// Kody bledow Postgresa.
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

/**
 * Mapuje bledy Postgresa na czytelne kody HTTP (zamiast surowego 500).
 * Lapie wylacznie pg.DatabaseError - pozostale wyjatki (w tym HttpException
 * z kontrolerow/guarda/ValidationPipe) obsluguje domyslny filtr Nest.
 */
@Catch(DatabaseError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: DatabaseError, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let httpException: HttpException;
    switch (exception.code) {
      case UNIQUE_VIOLATION:
        httpException = new ConflictException(
          'Zasob juz istnieje (naruszenie unikalnosci).',
        );
        break;
      case FOREIGN_KEY_VIOLATION:
        httpException = new BadRequestException(
          'Powiazany zasob nie istnieje (naruszenie klucza obcego).',
        );
        break;
      default:
        this.logger.error(
          `Unhandled DB error ${exception.code}: ${exception.message}`,
        );
        httpException = new InternalServerErrorException('Blad bazy danych.');
    }

    httpAdapter.reply(
      ctx.getResponse(),
      httpException.getResponse(),
      httpException.getStatus(),
    );
  }
}
