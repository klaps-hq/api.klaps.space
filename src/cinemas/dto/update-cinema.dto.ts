import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCinemaDto {
  @IsOptional()
  @IsString()
  description?: string | null;

  /** Manual correction of the name-based open-air guess. */
  @IsOptional()
  @IsBoolean()
  isOpenAir?: boolean;
}
