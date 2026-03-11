import { Inject, Injectable } from '@nestjs/common';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../database/schemas';
import { DRIZZLE } from '../database/constants';
import { eq } from 'drizzle-orm';
import type { Genre } from '../database/schemas/genres.schema';
import type { UpdateGenreDto } from './dto/update-genre.dto';

@Injectable()
export class GenresRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  // === READ ===

  async findAll(): Promise<Genre[]> {
    return this.db.query.genres.findMany();
  }

  async findByIdOrSlug(idOrSlug: string) {
    const numericId = Number(idOrSlug);
    const condition =
      Number.isInteger(numericId) && numericId > 0
        ? eq(schema.genres.id, numericId)
        : eq(schema.genres.slug, idOrSlug);

    return this.db.query.genres.findFirst({ where: condition });
  }

  // === WRITE ===

  async updateByIdOrSlug(
    idOrSlug: string,
    data: UpdateGenreDto,
  ): Promise<Genre | null> {
    const numericId = Number(idOrSlug);
    const condition =
      Number.isInteger(numericId) && numericId > 0
        ? eq(schema.genres.id, numericId)
        : eq(schema.genres.slug, idOrSlug);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name != null) updateData.name = data.name;
    if (data.slug != null) updateData.slug = data.slug;
    if (data.description !== undefined)
      updateData.description = data.description;

    await this.db.update(schema.genres).set(updateData).where(condition);

    const genre = await this.db.query.genres.findFirst({ where: condition });
    return genre ?? null;
  }
}
