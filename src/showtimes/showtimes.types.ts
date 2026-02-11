import { showtimes } from '../database/schemas';

/** Row type for the showtimes table. */
export type Showtime = typeof showtimes.$inferSelect;

/** Clean response shape for GET /showtimes/unprocessed. */
export type UnprocessedShowtimeResponse = {
  id: number;
  url: string;
  cityId: number;
  date: string;
  createdAt: string;
  updatedAt: string;
};
