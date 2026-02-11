import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body DTO for POST /showtimes.
 */
export class CreateShowtimeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  url: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId: number;

  @IsDateString()
  date: string;
}
