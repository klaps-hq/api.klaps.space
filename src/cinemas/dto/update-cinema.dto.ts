import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body DTO dla aktualizacji kina (PATCH /cinemas/:slug oraz legacy
 * POST /cinemas/:slug). Wszystkie pola opcjonalne - aktualizujemy tylko
 * przekazane. Nie pozwalamy edytowac sourceId/slug/sourceCityId (klucz
 * scrapera i relacja miasta).
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
}
