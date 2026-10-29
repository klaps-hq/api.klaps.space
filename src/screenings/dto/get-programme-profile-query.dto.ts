import { IsOptional, IsString } from 'class-validator';

/**
 * Query for GET /screenings/profile. Exactly one scope is expected; when
 * several are given the first of cinema, city, genre, director wins. A
 * scope that does not resolve yields an empty profile, never a nationwide
 * one.
 */
export class GetProgrammeProfileQueryDto {
  @IsOptional()
  @IsString({ message: 'cinemaSlug must be a string' })
  cinemaSlug?: string;

  @IsOptional()
  @IsString({ message: 'citySlug must be a string' })
  citySlug?: string;

  @IsOptional()
  @IsString({ message: 'genreSlug must be a string' })
  genreSlug?: string;

  @IsOptional()
  @IsString({ message: 'directorSlug must be a string' })
  directorSlug?: string;
}
