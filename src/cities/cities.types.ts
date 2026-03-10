import { cities } from '../database/schemas';

export type City = typeof cities.$inferSelect;
