import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body DTO for POST /screenings.
 */
export class CreateScreeningDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  url?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  movieId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  showtimeId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cinemaId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  type: string;

  @IsDateString()
  date: string;

  @Type(() => Boolean)
  @IsBoolean()
  isDubbing: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  isSubtitled: boolean;
}
