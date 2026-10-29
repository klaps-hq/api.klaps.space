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
 * Body DTO dla PATCH /screenings/:id. Wszystkie pola opcjonalne -
 * aktualizujemy tylko przekazane. Klucze obce (movieId/cinemaId/showtimeId)
 * sa walidowane w repozytorium (czytelne 400 zamiast surowego bledu PG).
 */
export class UpdateScreeningDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  url?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  movieId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  showtimeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cinemaId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  type?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDubbing?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isSubtitled?: boolean;
}
