import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body DTO for POST /showtimes/mark-processed.
 */
export class MarkShowtimeProcessedDto {
  @Type(() => Number)
  @IsInt({ message: 'showtimeId must be an integer' })
  @Min(1, { message: 'showtimeId must be a positive integer' })
  showtimeId: number;
}
