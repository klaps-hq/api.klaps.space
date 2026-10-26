import { Transform, Type } from 'class-transformer';
import { IsString, IsIn, Matches, IsInt, Min } from 'class-validator';
import { SOCIAL_PLATFORMS } from '../socials.constants';

export class SocialsActionDto {
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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  screeningId!: number;
}
