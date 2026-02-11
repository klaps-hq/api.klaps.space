import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Query DTO for GET /cinemas.
 * cityId: optional, positive integer — filter cinemas by city.
 * limit: optional, max number of cinemas to return (default 50).
 */
export class GetCinemasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cityId must be an integer' })
  @Min(1, { message: 'cityId must be a positive integer' })
  cityId?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined && value !== '' ? Number(value) : undefined,
  )
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  limit?: number;
}
