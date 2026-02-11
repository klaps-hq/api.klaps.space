import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCityDto } from './create-city.dto';

/**
 * Body DTO for POST /cities/batch.
 */
export class BatchCreateCitiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCityDto)
  cities: CreateCityDto[];
}
