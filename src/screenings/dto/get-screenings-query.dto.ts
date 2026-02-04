import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Query DTO for GET /screenings.
 * date: optional, YYYY-MM-DD (defaults to today in service).
 * cityId: optional, positive integer.
 * movieLimit: optional, max number of movies to return (default 50).
 */
export class GetScreeningsQueryDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'date must be a valid ISO date string (YYYY-MM-DD)' },
  )
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cityId must be an integer' })
  @Min(1, { message: 'cityId must be a positive integer' })
  cityId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : 50,
  )
  @Type(() => Number)
  @IsInt({ message: 'movieLimit must be an integer' })
  @Min(1, { message: 'movieLimit must be at least 1' })
  movieLimit: number = 50;
}
