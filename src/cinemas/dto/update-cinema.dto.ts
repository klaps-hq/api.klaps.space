import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CinemaRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  seats!: number | null;
}

export class CinemaAccessibilityDto {
  @IsOptional()
  @IsBoolean()
  wheelchair!: boolean | null;

  @IsOptional()
  @IsBoolean()
  hearingLoop!: boolean | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note!: string | null;
}

/** Venue detail columns; setting any of them bumps detailsUpdatedAt. */
export const CINEMA_DETAIL_FIELDS = [
  'phone',
  'repertoireUrl',
  'bookingUrl',
  'facebookUrl',
  'instagramUrl',
  'operatorName',
  'operatorUrl',
  'screens',
  'rooms',
  'accessibility',
  'logoUrl',
] as const;

/**
 * Body DTO dla aktualizacji kina (PATCH /cinemas/:slug oraz legacy
 * POST /cinemas/:slug). Wszystkie pola opcjonalne - aktualizujemy tylko
 * przekazane. Nie pozwalamy edytowac sourceId/slug/sourceCityId (klucz
 * scrapera i relacja miasta). Zdjecia (photos) ustawiaja tylko skrypty.
 */
export class UpdateCinemaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  /** Manual correction of the name-based open-air guess. */
  @IsOptional()
  @IsBoolean()
  isOpenAir?: boolean;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string | null;

  // === Venue details (researched, never touched by the scraper) ===

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  repertoireUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  bookingUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  facebookUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  instagramUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  operatorName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  operatorUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  screens?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CinemaRoomDto)
  rooms?: CinemaRoomDto[] | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CinemaAccessibilityDto)
  accessibility?: CinemaAccessibilityDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  logoUrl?: string | null;
}
