import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SPECIAL_TYPES,
  type SpecialType,
} from '../../database/schemas/series.schema';
import { ScreeningSeriesDto } from './create-screening.dto';

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

  // The ticketing scraper labels a Filmweb screening it only nearly matches
  // (other minute or flags) instead of saving a duplicate.
  @IsOptional()
  @IsIn(SPECIAL_TYPES)
  specialType?: SpecialType | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  editionNote?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScreeningSeriesDto)
  series?: ScreeningSeriesDto | null;
}
