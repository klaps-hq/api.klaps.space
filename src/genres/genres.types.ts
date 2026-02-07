import { genres } from '../database/schema/schema';

/** Row type for the genres table. */
export type Genre = typeof genres.$inferSelect;
