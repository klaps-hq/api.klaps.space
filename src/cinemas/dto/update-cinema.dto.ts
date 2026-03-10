import { IsOptional, IsString } from 'class-validator';

export class UpdateCinemaDto {
  @IsOptional()
  @IsString()
  description?: string | null;
}
