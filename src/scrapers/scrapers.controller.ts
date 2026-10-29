import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { ScrapersService } from './scrapers.service';
import {
  AppendLogsDto,
  GetLogsQueryDto,
  GetRunsQueryDto,
  HeartbeatDto,
  RegisterScraperDto,
  SCRAPER_ID_PATTERN,
  StartRunDto,
  UpdateRunDto,
  UpdateScraperDto,
} from './dto/scraper.dto';
import type {
  ScraperHeartbeatResponse,
  ScraperLogLineResponse,
  ScraperRunResponse,
  ScraperSummaryResponse,
} from './scrapers.types';

const scraperId = (id: string): string => {
  if (!SCRAPER_ID_PATTERN.test(id)) {
    throw new BadRequestException('Invalid scraper id');
  }
  return id;
};

/**
 * Scraper monitoring and control. Internal only: read and action endpoints
 * are used by the admin panel (studio.klaps.space), ingest endpoints by the
 * scraper itself, which reports runs and polls for commands.
 *
 * `runs` routes are declared before `:id` routes so "runs" is never parsed as
 * a scraper id.
 */
@Controller('scrapers')
@UseGuards(InternalApiKeyGuard)
export class ScrapersController {
  constructor(private readonly scrapersService: ScrapersService) {}

  // === Runs ===

  @Get('runs')
  getRuns(@Query() query: GetRunsQueryDto): Promise<ScraperRunResponse[]> {
    return this.scrapersService.getRuns(query);
  }

  @Get('runs/:runId')
  getRun(
    @Param('runId', ParseUUIDPipe) runId: string,
  ): Promise<ScraperRunResponse> {
    return this.scrapersService.getRun(runId);
  }

  @Get('runs/:runId/logs')
  getLogs(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Query() query: GetLogsQueryDto,
  ): Promise<ScraperLogLineResponse[]> {
    return this.scrapersService.getLogs(runId, query.level);
  }

  @Patch('runs/:runId')
  updateRun(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() body: UpdateRunDto,
  ): Promise<ScraperRunResponse> {
    return this.scrapersService.updateRun(runId, body);
  }

  @Post('runs/:runId/logs')
  @HttpCode(HttpStatus.NO_CONTENT)
  appendLogs(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() body: AppendLogsDto,
  ): Promise<void> {
    return this.scrapersService.appendLogs(runId, body);
  }

  // === Scrapers ===

  @Get()
  getScrapers(): Promise<ScraperSummaryResponse[]> {
    return this.scrapersService.getScrapers();
  }

  @Put(':id')
  register(
    @Param('id') id: string,
    @Body() body: RegisterScraperDto,
  ): Promise<ScraperSummaryResponse> {
    return this.scrapersService.register(scraperId(id), body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateScraperDto,
  ): Promise<ScraperSummaryResponse> {
    return this.scrapersService.setEnabled(scraperId(id), body.enabled);
  }

  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  heartbeat(
    @Param('id') id: string,
    @Body() body: HeartbeatDto,
  ): Promise<ScraperHeartbeatResponse> {
    return this.scrapersService.heartbeat(scraperId(id), body);
  }

  @Post(':id/runs')
  startRun(
    @Param('id') id: string,
    @Body() body: StartRunDto,
  ): Promise<ScraperRunResponse> {
    return this.scrapersService.startRun(scraperId(id), body);
  }

  @Post(':id/run')
  @HttpCode(HttpStatus.ACCEPTED)
  requestRun(@Param('id') id: string): Promise<{ queued: true }> {
    return this.scrapersService.requestRun(scraperId(id));
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.NO_CONTENT)
  requestStop(@Param('id') id: string): Promise<void> {
    return this.scrapersService.requestStop(scraperId(id));
  }
}
