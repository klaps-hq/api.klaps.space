import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Matches, Min } from 'class-validator';

export class GetSocialCandidateQueryDto {
  @IsOptional()
  @IsDateString({})
  @Transform(
    ({ value }: { value: unknown }) =>
      (value as string) ?? new Date().toISOString().slice(0, 10),
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  minScore?: number;
}
