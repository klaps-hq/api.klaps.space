import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const MAX_CINEMA_PHOTOS = 6;

export class CinemaPhotoDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1024)
  url!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(1024)
  sourceUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  author!: string;

  @IsIn(['commons', 'website'])
  source!: 'commons' | 'website';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  license!: string | null;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(512)
  licenseUrl!: string | null;
}

/**
 * Body of PUT /cinemas/:slug/photos. Replaces the whole gallery; an empty
 * array removes every photo (used for takedown requests).
 */
export class SetCinemaPhotosDto {
  @IsArray()
  @ArrayMaxSize(MAX_CINEMA_PHOTOS)
  @ValidateNested({ each: true })
  @Type(() => CinemaPhotoDto)
  photos!: CinemaPhotoDto[];
}
