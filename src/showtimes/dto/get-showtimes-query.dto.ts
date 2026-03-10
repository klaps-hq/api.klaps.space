import { IsDateString, IsOptional } from 'class-validator';
import { IsInt, Min } from 'class-validator';
import { IsString, MinLength } from 'class-validator';

export class GetShowtimesQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cityId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  citySlug?: string;
}
