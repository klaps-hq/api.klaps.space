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
 * Body DTO for POST /movies.
 */
export class CreateMovieDto {
  @Type(() => Number)
  @IsInt()
  filmwebId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  url: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleOriginal: string;

  @IsString()
  @IsOptional()
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(1800)
  productionYear: number;

  @IsOptional()
  @IsString()
  worldPremiereDate?: string;

  @IsOptional()
  @IsString()
  polishPremiereDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  usersRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usersRatingVotes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  criticsRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  criticsRatingVotes?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  language: string;

  @Type(() => Number)
  @IsInt()
  duration: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  posterUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  backdropUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  videoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  boxoffice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  distribution?: string;
}
