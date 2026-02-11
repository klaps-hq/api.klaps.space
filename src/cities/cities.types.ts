import { cities } from '../database/schemas';

/** Row type for the cities table. */
export type City = typeof cities.$inferSelect;
