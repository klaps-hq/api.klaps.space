import { Transform } from 'class-transformer';
import { getTodayInPoland } from '../../lib/date';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { SOCIAL_PLATFORMS } from '../socials.constants';

export class GetSocialCandidateQueryDto {
  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) => (value as string) ?? getTodayInPoland(),
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  dateFrom: string;

  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) => (value as string) ?? getTodayInPoland(),
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  dateTo: string;

  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  @Max(100, { message: 'minScore must be at most 100' })
  minScore: number;

  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  @Max(100, { message: 'numberOfCandidates must be at most 100' })
  numberOfCandidates: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(10, { message: 'maxPosts must be at most 10' })
  maxPosts?: number;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    String(value).trim().toLowerCase(),
  )
  @Matches(/^[a-z0-9_-]{2,30}$/, {
    message:
      'platform must be 2-30 chars and contain only lowercase letters, digits, "_" or "-"',
  })
  @IsIn(SOCIAL_PLATFORMS)
  platform!: string;
}
