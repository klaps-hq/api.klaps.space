import { IsOptional, IsString } from 'class-validator';

export class PostGenreDto {
  @IsOptional()
  @IsString()
  description?: string | null;
}
