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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import {
  PlanMediaQueryDto,
  PlansRangeQueryDto,
  ReplacePlansDto,
  UpdatePlanDto,
} from './dto/socials-plans.dto';
import {
  SocialsPlansService,
  type HistoryPostResponse,
  type PlanResponse,
} from './socials-plans.service';

// Minimal shape of a multer memory-storage file (@types/multer not installed).
type UploadedImageFile = { buffer: Buffer; mimetype: string; size: number };

/**
 * Planned posts: klaps.radar prepares upcoming posts with its publishing
 * code and stores them here; the admin panel reads them (and the history of
 * what went out). Internal only.
 */
@Controller('socials')
@UseGuards(InternalApiKeyGuard)
export class SocialsPlansController {
  constructor(private readonly plans: SocialsPlansService) {}

  @Get('plans')
  getPlans(@Query() query: PlansRangeQueryDto): Promise<PlanResponse[]> {
    return this.plans.getPlans(query.from, query.to);
  }

  @Put('plans')
  replacePlans(
    @Body() body: ReplacePlansDto,
  ): Promise<{ slotKey: string; id: string }[]> {
    return this.plans.replacePlans(body);
  }

  @Patch('plans')
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePlan(@Body() body: UpdatePlanDto): Promise<void> {
    return this.plans.updatePlan(body);
  }

  @Post('plans/:id/media')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  addMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PlanMediaQueryDto,
    @UploadedFile() file: UploadedImageFile | undefined,
  ): Promise<{ id: string }> {
    if (!file) throw new BadRequestException('file is required');
    return this.plans.addMedia(id, file, query.position ?? 0);
  }

  @Get('plans/media/:mediaId')
  async getMedia(
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Res() res: Response,
  ): Promise<void> {
    const media = await this.plans.getMedia(mediaId);
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(media.data);
  }

  @Get('history')
  getHistory(
    @Query() query: PlansRangeQueryDto,
  ): Promise<HistoryPostResponse[]> {
    return this.plans.getHistory(query.from, query.to);
  }
}
