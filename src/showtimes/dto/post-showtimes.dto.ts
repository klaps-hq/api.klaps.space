import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PostShowtimesShowtimeDto {
  @IsUrl()
  @IsString()
  url: string;

  @IsInt()
  @Min(1)
  cityId: number;

  @IsDateString()
  date: string;
}

export class PostShowtimesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostShowtimesShowtimeDto)
  showtimes: PostShowtimesShowtimeDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  scrapedCityIds?: number[];
}
