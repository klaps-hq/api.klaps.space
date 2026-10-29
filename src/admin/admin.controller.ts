import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { isDeletableEntity, type DeletePreview } from './admin.types';

/**
 * Operacje niszczace panelu admina: kaskadowe usuwanie encji po slugu wraz z
 * podgladem zaleznosci. Scentralizowane, bo przechodza przez wiele tabel.
 */
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get(':entity/:slug/delete-preview')
  @UseGuards(InternalApiKeyGuard)
  getDeletePreview(
    @Param('entity') entity: string,
    @Param('slug') slug: string,
  ): Promise<DeletePreview> {
    if (!isDeletableEntity(entity)) {
      throw new BadRequestException(`Unsupported entity "${entity}"`);
    }
    return this.adminService.getDeletePreview(entity, slug);
  }

  @Delete(':entity/:slug')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEntity(
    @Param('entity') entity: string,
    @Param('slug') slug: string,
  ): Promise<void> {
    if (!isDeletableEntity(entity)) {
      throw new BadRequestException(`Unsupported entity "${entity}"`);
    }
    await this.adminService.deleteEntity(entity, slug);
  }
}
