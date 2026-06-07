import { IsIn, IsOptional, IsString } from 'class-validator';
import { VOIVODESHIPS, type Voivodeship } from '../../lib/voivodeships';

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsIn(VOIVODESHIPS)
  voivodeship?: Voivodeship;
}
