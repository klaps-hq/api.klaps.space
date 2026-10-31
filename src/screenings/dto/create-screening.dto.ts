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

/** A cycle, festival or club the screening belongs to, by name. */
export class ScreeningSeriesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsIn(SPECIAL_TYPES)
  type: SpecialType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  organizer?: string;

  @IsOptional()
  @IsBoolean()
  isChainProgramme?: boolean;
}

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

  // Special-screening fields. Omitted fields leave the stored values alone,
  // so the Filmweb scraper (which never sends them) keeps the labels the
  // ticketing scraper set on the same screening.
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
