import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Query DTO for GET /screenings.
 * dateFrom: optional, YYYY-MM-DD (defaults to today in service).
 * dateTo: optional, YYYY-MM-DD (defaults to 30 days from today in service).
 * movieId: optional, positive integer.
 * cityId: optional, positive integer.
 * page: optional, page number (default 1).
 * limit: optional, max number of movies per page (default 10).
 */
export class GetScreeningsQueryDto {
  @IsOptional()
  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) =>
      (value as string) ?? new Date().toISOString().slice(0, 10),
  )
  dateFrom?: string;

  @IsOptional()
  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) =>
      (value as string) ?? new Date().toISOString().slice(0, 10),
  )
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'movieId must be an integer' })
  @Min(1, { message: 'movieId must be a positive integer' })
  movieId?: number;

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
  @IsString({ message: 'search must be a string' })
  @MinLength(1, { message: 'search must be at least 1 character' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  limit?: number;
}
