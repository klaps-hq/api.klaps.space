import { screeningsTable } from '../database/schemas/screenings.schema';

/** Raw DB screening row (used by POST / scrapper). */
export type Screening = typeof screeningsTable.$inferSelect;

/** Params for the screenings list endpoint. */
export type GetScreeningsParams = {
  dateFrom?: string;
  dateTo?: string;
  movieId?: number;
  cityId?: number | undefined;
  genreId?: number | undefined;
  limit?: number;
};
