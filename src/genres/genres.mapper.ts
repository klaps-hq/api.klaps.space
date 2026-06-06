import type { GenreResponse } from './genres.types';

export const mapGenre = (
  genre: {
    id: number;
    slug: string;
    name: string;
    description?: string | null;
  },
  updatedAt?: Date,
): GenreResponse => ({
  id: genre.id,
  slug: genre.slug,
  name: genre.name,
  description: genre.description ?? null,
  ...(updatedAt !== undefined && { updatedAt: updatedAt.toISOString() }),
});
