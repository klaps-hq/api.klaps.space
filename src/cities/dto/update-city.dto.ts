import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VOIVODESHIPS, type Voivodeship } from '../../lib/voivodeships';

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameDeclinated?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  population?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  /** Long guide to the city's cinemas (paragraphs split by blank lines). */
  @IsOptional()
  @IsString()
  guide?: string | null;

  @IsOptional()
  @IsIn(VOIVODESHIPS)
  voivodeship?: Voivodeship;
}
