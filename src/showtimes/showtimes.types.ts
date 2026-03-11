import { showtimes } from '../database/schemas';

export type Showtime = typeof showtimes.$inferSelect;

export type ShowtimeResponse = {
  id: number;
  url: string;
  cityId: number;
  date: string;
};
