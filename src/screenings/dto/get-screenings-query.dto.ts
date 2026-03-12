import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { getTodayInPoland } from '../../lib/date';

export class GetScreeningsQueryDto {
  @IsOptional()
  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) => (value as string) ?? getTodayInPoland(),
  )
  dateFrom?: string;

  @IsOptional()
  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) => (value as string) ?? getTodayInPoland(),
  )
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'movieId must be an integer' })
  @Min(1, { message: 'movieId must be a positive integer' })
  movieId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cityId must be an integer' })
  @Min(1, { message: 'cityId must be a positive integer' })
  cityId?: number;

  @IsOptional()
  @IsString({ message: 'citySlug must be a string' })
  citySlug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'genreId must be an integer' })
  @Min(1, { message: 'genreId must be a positive integer' })
  genreId?: number;

  @IsOptional()
  @IsString({ message: 'genreSlug must be a string' })
  genreSlug?: string;

  @IsOptional()
  @IsString({ message: 'cinemaSlug must be a string' })
  cinemaSlug?: string;

  @IsOptional()
  @IsString({ message: 'search must be a string' })
  @MinLength(1, { message: 'search must be at least 1 character' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;
}
