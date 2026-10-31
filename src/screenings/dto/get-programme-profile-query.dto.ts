import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { QueryBoolean } from '../../lib/query-boolean';

/**
 * Query for GET /screenings/profile. Exactly one scope is expected; when
 * several are given the first of cinema, city, genre, director, movie wins. A
 * scope that does not resolve yields an empty profile, never a nationwide
 * one.
 *
 * Genre and director profiles count only independent cinemas unless
 * `includeChains=true`; cinema, city and movie profiles ignore the flag.
 * A city profile counts independent cinemas only with `independentOnly=true`.
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

  @IsOptional()
  @IsString({ message: 'movieSlug must be a string' })
  movieSlug?: string;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  includeChains?: boolean;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  independentOnly?: boolean;
}
