import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { SOCIAL_PLATFORMS } from '../socials.constants';
import { SERIES_KINDS, type SeriesKind } from '../socials-series.types';

export class GetMonthStatsQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month!: string;
}

export class GetRetrospectivesQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateFrom must be in YYYY-MM-DD format',
  })
  dateFrom!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateTo must be in YYYY-MM-DD format',
  })
  dateTo!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10)
  minFilms?: number;
}

export class RecordSeriesPostDto {
  @IsIn(SERIES_KINDS)
  kind!: SeriesKind;

  // A month ("2026-10") for stats, a director id for retrospectives.
  @IsString()
  @Matches(/^[a-z0-9-]{1,40}$/i)
  key!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    String(value).trim().toLowerCase(),
  )
  @IsIn(SOCIAL_PLATFORMS)
  platform!: string;
}
