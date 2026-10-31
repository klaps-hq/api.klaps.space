import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { QueryBoolean } from '../../lib/query-boolean';

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Query for GET /screenings/profile. Exactly one scope is expected; when
 * several are given the first of cinema, city, genre, director, movie wins. A
 * scope that does not resolve yields an empty profile, never a nationwide
 * one.
 *
 * Genre and director profiles count only independent cinemas unless
 * `includeChains=true`; cinema, city and movie profiles ignore the flag.
 * A city profile counts independent cinemas only with `independentOnly=true`.
 *
 * `from` and `to` (YYYY-MM-DD, both inclusive) narrow the profile to a date
 * range; `allCities=true` lists every city instead of the top five.
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

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'from must be a date in YYYY-MM-DD format',
  })
  from?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'to must be a date in YYYY-MM-DD format' })
  to?: string;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  allCities?: boolean;
}
