import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body DTO for POST /showtimes/mark-city-processed.
 * cityId: required, references cities.id.
 * processedAt: optional, ISO date (YYYY-MM-DD). Defaults to today in Europe/Warsaw.
 */
export class MarkCityProcessedDto {
  @Type(() => Number)
  @IsInt({ message: 'cityId must be an integer' })
  @Min(1, { message: 'cityId must be a positive integer' })
  cityId: number;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'processedAt must be a valid ISO date (YYYY-MM-DD)' },
  )
  processedAt?: string;
}
