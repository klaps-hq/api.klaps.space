import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  RECENT_SCREENINGS_MAX_DAYS,
  RECENT_SCREENINGS_MAX_LIMIT,
} from '../screenings.constants';

/** Query for GET /screenings/recent-venues. */
export class GetRecentVenuesQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'movieId must be an integer' })
  @Min(1, { message: 'movieId must be a positive integer' })
  movieId: number;

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
