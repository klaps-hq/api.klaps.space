import { genres } from '../database/schemas';

export type Genre = typeof genres.$inferSelect;

export type GenreResponse = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  /** ISO 8601 UTC; ostatnia zauważalna zmiana treści (gatunek lub jego filmy). */
  updatedAt?: string;
};
