import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Screening (no movieId/showtimeId — resolved by backend) ─

export class ProcessShowtimeScreeningDto {
  @IsOptional()
  @IsString()
  url?: string | null;

  @Type(() => Number)
  @IsInt()
  cinemaId: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsBoolean()
  isDubbing: boolean;

  @IsBoolean()
  isSubtitled: boolean;
}

// ── Top-level DTO ───────────────────────────────────────────

export class ProcessShowtimeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  movieId: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessShowtimeScreeningDto)
  screenings: ProcessShowtimeScreeningDto[];
}
