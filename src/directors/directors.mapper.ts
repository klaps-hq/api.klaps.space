import type {
  DirectorResponse,
  DirectorRole,
  DirectorStats,
} from './directors.types';

export const mapDirector = (
  director: {
    id: number;
    slug: string | null;
    name: string;
    sourceId: number;
    role: string;
    bio: string | null;
    photoUrl: string | null;
  },
  stats: DirectorStats,
  updatedAt: Date | null,
): DirectorResponse => ({
  id: director.id,
  slug: director.slug ?? '',
  name: director.name,
  sourceId: director.sourceId,
  role: director.role as DirectorRole,
  bio: director.bio ?? null,
  photoUrl: director.photoUrl ?? null,
  upcomingScreeningsCount: stats.upcomingScreeningsCount,
  moviesCount: stats.moviesCount,
  updatedAt: updatedAt ? updatedAt.toISOString() : null,
});
