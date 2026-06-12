import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ActorInsertDto {
  @Type(() => Number)
  @IsInt()
  sourceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  url: string;
}

export class DirectorInsertDto extends ActorInsertDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  photoUrl?: string;
}

export class CountryInsertDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  countryCode: string;
}

export class GenreInsertDto {
  @Type(() => Number)
  @IsInt()
  sourceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;
}

export class CreateMoviesBatchItemDto {
  @Type(() => Number)
  @IsInt()
  sourceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  url: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleOriginal: string;

  @IsString()
  @IsOptional()
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(1800)
  productionYear: number;

  @IsOptional()
  @IsString()
  worldPremiereDate?: string;

  @IsOptional()
  @IsString()
  polishPremiereDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  usersRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usersRatingVotes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  criticsRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  criticsRatingVotes?: number;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  posterUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  backdropUrl?: string;

  // Tiny base64 webp previews for next/image placeholder="blur"; a few
  // hundred bytes each, capped well above that to leave headroom.
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  posterBlurDataUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  backdropBlurDataUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  videoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  boxoffice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  distribution?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActorInsertDto)
  actors?: ActorInsertDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectorInsertDto)
  directors?: DirectorInsertDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActorInsertDto)
  scriptwriters?: ActorInsertDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountryInsertDto)
  countries?: CountryInsertDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenreInsertDto)
  genres?: GenreInsertDto[];
}

export class CreateMoviesBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMoviesBatchItemDto)
  movies: CreateMoviesBatchItemDto[];
}
