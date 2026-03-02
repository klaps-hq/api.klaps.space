import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class GetSocialCandidateQueryDto {
  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) =>
      (value as string) ?? new Date().toISOString().slice(0, 10),
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  dateFrom: string;

  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) =>
      (value as string) ?? new Date().toISOString().slice(0, 10),
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

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    String(value).trim().toLowerCase(),
  )
  @Matches(/^[a-z0-9_-]{2,30}$/, {
    message:
      'platform must be 2-30 chars and contain only lowercase letters, digits, "_" or "-"',
  })
  @IsIn([
    'instagram_post',
    'instagram_story',
    'facebook_post',
    'facebook_story',
    'x_post',
    'threads_post',
  ])
  platform!: string;
}
