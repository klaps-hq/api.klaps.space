import { screeningsTable } from '../database/schemas/screenings.schema';

export type Screening = typeof screeningsTable.$inferSelect;

export type GetScreeningsParams = {
  dateFrom?: string;
  dateTo?: string;
  movieId?: number;
  cityId?: number | undefined;
  citySlug?: string | undefined;
  genreId?: number | undefined;
  genreSlug?: string | undefined;
  cinemaSlug?: string | undefined;
  search?: string;
};
