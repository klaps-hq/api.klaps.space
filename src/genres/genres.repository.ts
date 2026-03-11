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

  async findBySlug(slug: string) {
    return this.db.query.genres.findFirst({
      where: eq(schema.genres.slug, slug),
    });
  }

  // === WRITE ===

  async updateBySlug(
    slug: string,
    data: UpdateGenreDto,
  ): Promise<Genre | null> {
    const condition = eq(schema.genres.slug, slug);

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
