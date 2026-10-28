import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LANDING_INTRO_MAX_LENGTH } from '../landing-intros.constants';

export class UpsertLandingIntroDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(LANDING_INTRO_MAX_LENGTH)
  content: string;
}
