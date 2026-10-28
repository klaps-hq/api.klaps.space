import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QueryBoolean } from '../../lib/query-boolean';

export class GetCinemasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId?: number;

  @IsOptional()
  @IsString()
  citySlug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  /** Only open-air venues (summer cinema series). */
  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  openAir?: boolean;
}
