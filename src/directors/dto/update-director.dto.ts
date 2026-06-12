import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { DirectorRole } from '../directors.types';

const ROLES: DirectorRole[] = ['director', 'actor', 'screenwriter'];

// Note: `slug` is intentionally not updatable - director slugs are frozen so
// public URLs stay stable. Only content fields can be patched here.
export class UpdateDirectorDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  photoUrl?: string | null;

  @IsOptional()
  @IsIn(ROLES)
  role?: DirectorRole;
}
