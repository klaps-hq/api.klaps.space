import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCinemaDto } from './create-cinema.dto';

/**
 * Body DTO for POST /cinemas/batch.
 */
export class BatchCreateCinemasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCinemaDto)
  cinemas: CreateCinemaDto[];
}
