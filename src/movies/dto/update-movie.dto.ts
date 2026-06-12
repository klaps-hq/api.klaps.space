import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMovieDto {
  // movies.description is NOT NULL in the schema, so unlike cities/cinemas this
  // does not accept null.
  @IsOptional()
  @IsString()
  description?: string;

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
