import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateShowtimeDto } from './create-showtime.dto';

/**
 * Body DTO for POST /showtimes/batch.
 */
export class BatchCreateShowtimesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShowtimeDto)
  showtimes: CreateShowtimeDto[];
}
