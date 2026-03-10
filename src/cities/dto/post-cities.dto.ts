import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PostCitiesBatchCityDto {
  @Type(() => Number)
  @IsInt()
  sourceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameDeclinated: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  areacode?: number;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  population?: number;
}

export class PostCitiesBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostCitiesBatchCityDto)
  cities: PostCitiesBatchCityDto[];
}

export class PostCityDto {
  @IsOptional()
  @IsString()
  description?: string | null;
}
