import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Query DTO for GET /movies.
 * page: optional, page number (default 1).
 * limit: optional, items per page (default 20, max 100).
 */
export class GetMoviesQueryDto {
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
