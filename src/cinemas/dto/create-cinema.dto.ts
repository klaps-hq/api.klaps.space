import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body DTO for POST /cinemas.
 */
export class CreateCinemaDto {
  @Type(() => Number)
  @IsInt({ message: 'sourceId must be an integer' })
  @Min(1)
  sourceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  url: string;

  @Type(() => Number)
  @IsInt({ message: 'sourceCityId must be an integer' })
  @Min(1)
  sourceCityId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string | null;
}
