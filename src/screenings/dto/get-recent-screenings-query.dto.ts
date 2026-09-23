import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  RECENT_SCREENINGS_MAX_DAYS,
  RECENT_SCREENINGS_MAX_LIMIT,
} from '../screenings.constants';

/**
 * Query for GET /screenings/recent.
 *
 * Scope by one cinema or one city. With no scope the listing is nationwide,
 * which is valid but rarely useful; a scope that does not resolve to an
 * existing cinema or city yields an empty list rather than falling back to
 * nationwide results.
 */
export class GetRecentScreeningsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cinemaId must be an integer' })
  @Min(1, { message: 'cinemaId must be a positive integer' })
  cinemaId?: number;

  @IsOptional()
  @IsString({ message: 'cinemaSlug must be a string' })
  cinemaSlug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cityId must be an integer' })
  @Min(1, { message: 'cityId must be a positive integer' })
  cityId?: number;

  @IsOptional()
  @IsString({ message: 'citySlug must be a string' })
  citySlug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'days must be an integer' })
  @Min(1, { message: 'days must be at least 1' })
  @Max(RECENT_SCREENINGS_MAX_DAYS, {
    message: `days must be at most ${RECENT_SCREENINGS_MAX_DAYS}`,
  })
  days?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be a positive integer' })
  @Max(RECENT_SCREENINGS_MAX_LIMIT, {
    message: `limit must be at most ${RECENT_SCREENINGS_MAX_LIMIT}`,
  })
  limit?: number;
}
