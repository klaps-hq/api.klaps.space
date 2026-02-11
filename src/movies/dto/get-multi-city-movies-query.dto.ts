import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Query DTO for GET /movies/multi-city.
 * limit: optional, max number of movies to return (default 5).
 * minCities: optional, minimum unique cities required (default 2).
 */
export class GetMultiCityMoviesQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit must be at most 50' })
  limit?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @Type(() => Number)
  @IsInt({ message: 'minCities must be an integer' })
  @Min(2, { message: 'minCities must be at least 2' })
  minCities?: number;
}
