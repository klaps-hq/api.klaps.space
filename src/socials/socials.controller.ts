import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

// Minimal shape of a multer memory-storage file (@types/multer not installed).
type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};
import type { SocialsGetCandidateResponse } from './socials.types';
import { GetSocialCandidateQueryDto } from './dto/get-socials-candidate-query.dto';
import { SocialsService } from './socials.service';
import { SocialsActionDto } from './dto/socials-action.dto';

@Controller('socials')
export class SocialsController {
  constructor(private readonly socialsService: SocialsService) {}

  @Get('candidate')
  @UseGuards(InternalApiKeyGuard)
  getCandidate(
    @Query() query: GetSocialCandidateQueryDto,
  ): Promise<SocialsGetCandidateResponse> {
    return this.socialsService.getCandidate(query);
  }

  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalApiKeyGuard)
  reserve(@Body() body: SocialsActionDto): Promise<void> {
    return this.socialsService.reserveCandidate(body);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalApiKeyGuard)
  publish(@Body() body: SocialsActionDto): Promise<void> {
    return this.socialsService.publishCandidate(body);
  }

  @Post('image')
  @UseGuards(InternalApiKeyGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  uploadImage(
    @UploadedFile() file: UploadedImageFile | undefined,
  ): Promise<{ id: string }> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.socialsService.storeImage(file.buffer, file.mimetype);
  }

  // Public on purpose: Instagram's Graph API downloads the media from this
  // URL when ingesting a post.
  @Get('image/:id')
  async getImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const image = await this.socialsService.getImage(id);
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(image.data);
  }
}
