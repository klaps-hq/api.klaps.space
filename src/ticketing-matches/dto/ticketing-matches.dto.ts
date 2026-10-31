import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const MATCH_STATUSES = [
  'matched',
  'event',
  'not-film',
  'unresolved',
] as const;
export const REVIEW_FILTERS = ['unresolved', 'suspicious', 'manual'] as const;

/** One match as the scraper resolved it. */
export class TicketingMatchDto {
  @IsString()
  @MaxLength(500)
  key!: string;

  @IsString()
  @MaxLength(50)
  provider!: string;

  @IsString()
  @MaxLength(500)
  rawTitle!: string;

  @IsIn(MATCH_STATUSES)
  status!: (typeof MATCH_STATUSES)[number];

  @IsOptional()
  @IsInt()
  filmwebId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string | null;

  @IsOptional()
  @IsInt()
  year?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  method?: string | null;

  @IsOptional()
  @IsNumber()
  confidence?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  @IsObject()
  result!: Record<string, unknown>;

  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  cinemas!: number[];

  @IsInt()
  @Min(0)
  screenings!: number;

  @IsOptional()
  @IsString()
  checkedAt?: string;
}

/** PUT /ticketing-matches - the scraper saves its matches after a run. */
export class SaveTicketingMatchesDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => TicketingMatchDto)
  matches!: TicketingMatchDto[];
}

/**
 * PATCH /ticketing-matches - a correction from the panel. Exactly one of
 * filmwebId, notFilm or reviewed is expected. A manual row is never
 * overwritten by the scraper.
 */
export class ReviewTicketingMatchDto {
  @IsString()
  @MaxLength(500)
  key!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  filmwebId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsBoolean()
  notFilm?: boolean;

  /** Confirms the scraper's match as it is. */
  @IsOptional()
  @IsBoolean()
  reviewed?: boolean;
}

export class GetTicketingMatchesQueryDto {
  @IsOptional()
  @IsIn(REVIEW_FILTERS)
  review?: (typeof REVIEW_FILTERS)[number];
}
