import { IsIn, IsOptional } from 'class-validator';
import { VOIVODESHIPS, type Voivodeship } from '../../lib/voivodeships';

export class GetCitiesWithCinemasQueryDto {
  @IsOptional()
  @IsIn(VOIVODESHIPS)
  voivodeship?: Voivodeship;
}
