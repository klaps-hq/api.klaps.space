import { showtimes } from '../database/schemas';

/** Row type for the showtimes table. */
export type Showtime = typeof showtimes.$inferSelect;
