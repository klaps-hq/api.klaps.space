import { directors } from '../database/schemas';

export type Director = typeof directors.$inferSelect;

/** Roles the person model can represent. Only 'director' is populated this iteration. */
export type DirectorRole = 'director' | 'actor' | 'screenwriter';

export type GetDirectorsParams = {
  search?: string;
  page?: number;
  limit?: number;
};

/** Aggregate stats computed per director for list/detail responses. */
export type DirectorStats = {
  moviesCount: number;
  upcomingScreeningsCount: number;
  upcomingIndependentScreeningsCount: number;
};

export type DirectorResponse = {
  id: number;
  slug: string;
  name: string;
  sourceId: number;
  role: DirectorRole;
  bio: string | null;
  photoUrl: string | null;
  /** Number of screenings with date >= today across the director's films. */
  upcomingScreeningsCount: number;
  /**
   * The same count limited to independent (non-chain) cinemas. Decides
   * whether the director page is indexable and listed in the sitemap
   * (DIRECTOR_INDEX_THRESHOLD): a mass multiplex reissue alone does not make
   * a director page about special screenings.
   */
  upcomingIndependentScreeningsCount: number;
  /** Number of distinct films linked to the director. */
  moviesCount: number;
  /** ISO 8601 UTC; GREATEST(director.updatedAt, newest screening.updatedAt). */
  updatedAt: string | null;
};
