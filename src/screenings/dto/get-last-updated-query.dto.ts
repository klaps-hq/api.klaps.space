import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VOIVODESHIPS, type Voivodeship } from '../../lib/voivodeships';

export class GetLastUpdatedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cityId must be an integer' })
  @Min(1, { message: 'cityId must be a positive integer' })
  cityId?: number;

  @IsOptional()
  @IsString({ message: 'citySlug must be a string' })
  citySlug?: string;

  @IsOptional()
  @IsIn(VOIVODESHIPS)
  voivodeship?: Voivodeship;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'directorId must be an integer' })
  @Min(1, { message: 'directorId must be a positive integer' })
  directorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cinemaId must be an integer' })
  @Min(1, { message: 'cinemaId must be a positive integer' })
  cinemaId?: number;

  @IsOptional()
  @IsString({ message: 'cinemaSlug must be a string' })
  cinemaSlug?: string;
}
