import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateShowtimeDto } from './create-showtime.dto';

export class BatchCreateShowtimesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShowtimeDto)
  showtimes: CreateShowtimeDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  scrapedCityIds?: number[];
}
