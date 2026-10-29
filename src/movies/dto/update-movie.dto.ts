import {
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMovieDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleOriginal?: string;

  // movies.description is NOT NULL in the schema, so unlike cities/cinemas this
  // does not accept null.
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1880)
  @Max(2100)
  productionYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  duration?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  language?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  posterUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  backdropUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  videoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  distribution?: string | null;

  // Tiny base64 webp previews for next/image placeholder="blur"; written by
  // the scraper blur backfill.
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  posterBlurDataUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  backdropBlurDataUrl?: string;
}
