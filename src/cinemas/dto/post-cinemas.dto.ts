import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PostCinemasBatchCinemaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
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
  url: string;

  @Type(() => Number)
  @IsInt()
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

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class PostCinemasBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostCinemasBatchCinemaDto)
  cinemas: PostCinemasBatchCinemaDto[];
}

export class PostCinemaDto {
  @IsOptional()
  @IsString()
  description?: string | null;
}
