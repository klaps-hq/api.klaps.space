import { genres } from '../database/schemas';

export type Genre = typeof genres.$inferSelect;

export type GenreResponse = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
};
