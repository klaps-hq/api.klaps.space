import { Transform } from 'class-transformer';
import { IsString, IsIn, Matches, Max, Min, IsInt } from 'class-validator';

export class SocialsReserveRequestDto {
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

  @IsInt()
  @Min(0)
  screeningId!: number;
}
