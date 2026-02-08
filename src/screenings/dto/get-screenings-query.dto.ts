import { IsDateString, IsInt, IsOptional, MaxDate, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Query DTO for GET /screenings.
 * dateFrom: optional, YYYY-MM-DD (defaults to today in service).
 * dateTo: optional, YYYY-MM-DD (defaults to 30 days from today in service).
 * cityId: optional, positive integer.
 * limit: optional, max number of movies to return (default 10).
 */
export class GetScreeningsQueryDto {
  @IsOptional()
  @IsDateString({})
  @Transform(({ value }) => value ?? new Date().toISOString().slice(0, 10))
  dateFrom?: string;

  @IsOptional()
  @IsDateString({})
  @Transform(({ value }) => value ?? new Date().toISOString().slice(0, 10))
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cityId must be an integer' })
  @Min(1, { message: 'cityId must be a positive integer' })
  cityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'genreId must be an integer' })
  @Min(1, { message: 'genreId must be a positive integer' })
  genreId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  limit?: number;
}
