import { IsOptional, IsString } from 'class-validator';

export class UpdateMovieDto {
  // movies.description is NOT NULL in the schema, so unlike cities/cinemas this
  // does not accept null.
  @IsOptional()
  @IsString()
  description?: string;
}
