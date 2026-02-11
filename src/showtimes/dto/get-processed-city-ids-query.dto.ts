import { IsDateString, IsOptional } from 'class-validator';

/**
 * Query DTO for GET /showtimes/processed-city-ids.
 */
export class GetProcessedCityIdsQueryDto {
  @IsDateString()
  @IsOptional()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate: string;
}
