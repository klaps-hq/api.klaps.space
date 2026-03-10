import { showtimes } from '../database/schemas';

export type Showtime = typeof showtimes.$inferSelect;
