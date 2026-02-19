import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body DTO for POST /cities.
 */
export class CreateCityDto {
  @Type(() => Number)
  @IsInt()
  sourceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameDeclinated: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  areacode?: number;
}
