import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Query DTO for GET /movies.
 * page: optional, page number (default 1).
 * limit: optional, items per page (default 20, max 100).
 */
export class GetMoviesQueryDto {
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  @MinLength(1, { message: 'search must be at least 1 character' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;

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
  @Max(1000, { message: 'limit must be at most 1000' })
  limit?: number;
}
