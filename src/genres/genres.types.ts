import { genres } from '../database/schemas';

/** Row type for the genres table. */
export type Genre = typeof genres.$inferSelect;
