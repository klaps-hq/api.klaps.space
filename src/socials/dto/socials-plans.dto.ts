import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SOCIAL_PLATFORMS } from '../socials.constants';

export const PLAN_STATUSES = [
  'pending',
  'planned',
  'skipped',
  'published',
  'failed',
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

class PlanInputDto {
  @IsString()
  @MaxLength(200)
  slotKey!: string;

  @IsDateString()
  slotAt!: string;

  @IsIn(SOCIAL_PLATFORMS)
  platform!: string;

  @IsString()
  @MaxLength(100)
  format!: string;

  @IsIn(['pending', 'planned', 'skipped'])
  status!: 'pending' | 'planned' | 'skipped';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;

  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  screeningIds!: number[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  caption?: string | null;
}

/** PUT /socials/plans - radar replaces the unpublished plans of a window. */
export class ReplacePlansDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PlanInputDto)
  plans!: PlanInputDto[];
}

/** PATCH /socials/plans/by-slot - radar reports the publication outcome. */
export class UpdatePlanDto {
  @IsString()
  @MaxLength(200)
  slotKey!: string;

  @IsIn(['published', 'failed'])
  status!: 'published' | 'failed';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  permalink?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class PlanMediaQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class PlansRangeQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
