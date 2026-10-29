import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  LOG_LEVELS,
  RUN_STATUSES,
  RUN_TRIGGERS,
  SCRAPER_KINDS,
} from '../scrapers.types';

export const SCRAPER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,49}$/;

/** PUT /scrapers/:id - the scraper registers itself on startup. */
export class RegisterScraperDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsIn(SCRAPER_KINDS)
  kind!: (typeof SCRAPER_KINDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  schedule?: string | null;

  @IsOptional()
  @IsDateString()
  nextRunAt?: string | null;
}

/** PATCH /scrapers/:id - admin toggle. */
export class UpdateScraperDto {
  @IsBoolean()
  enabled!: boolean;
}

/** POST /scrapers/:id/heartbeat */
export class HeartbeatDto {
  @IsOptional()
  @IsDateString()
  nextRunAt?: string | null;
}

/** POST /scrapers/:id/runs - the scraper opens a run. */
export class StartRunDto {
  @IsOptional()
  @IsIn(RUN_TRIGGERS)
  trigger?: (typeof RUN_TRIGGERS)[number];
}

class RunStatsDto {
  @IsInt() @Min(0) fetched!: number;
  @IsInt() @Min(0) saved!: number;
  @IsInt() @Min(0) updated!: number;
  @IsInt() @Min(0) skipped!: number;
  @IsInt() @Min(0) failed!: number;
}

class RunStageDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsIn(RUN_STATUSES)
  status!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs!: number | null;

  @IsObject()
  stats!: Record<string, number>;
}

class RunProgressDto {
  @IsString()
  @MaxLength(100)
  stage!: string;

  @IsInt() @Min(0) done!: number;
  @IsInt() @Min(0) total!: number;
}

/** PATCH /scrapers/runs/:id - stats and stages are replaced as a whole. */
export class UpdateRunDto {
  @IsOptional()
  @IsIn(RUN_STATUSES)
  status?: (typeof RUN_STATUSES)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => RunStatsDto)
  stats?: RunStatsDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RunStageDto)
  stages?: RunStageDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RunProgressDto)
  progress?: RunProgressDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  error?: string | null;
}

class LogLineDto {
  @IsDateString()
  ts!: string;

  @IsIn(LOG_LEVELS)
  level!: (typeof LOG_LEVELS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  stage?: string | null;

  @IsString()
  @MaxLength(4000)
  message!: string;
}

/** POST /scrapers/runs/:id/logs - batch of log lines. */
export class AppendLogsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LogLineDto)
  lines!: LogLineDto[];
}

export class GetRunsQueryDto {
  @IsOptional()
  @Matches(SCRAPER_ID_PATTERN)
  scraperId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class GetLogsQueryDto {
  @IsOptional()
  @IsIn(LOG_LEVELS)
  level?: (typeof LOG_LEVELS)[number];
}
