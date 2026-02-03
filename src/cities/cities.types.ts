import { cities } from '../database/schema/schema';

/** Row type for the cities table. */
export type City = typeof cities.$inferSelect;
