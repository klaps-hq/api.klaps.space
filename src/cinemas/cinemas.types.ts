import { cinemas } from '../database/schema/schema';

/** Row type for the cinemas table. */
export type Cinema = typeof cinemas.$inferSelect;

export type CinemaWithCityName = Cinema & {
  cityName: string;
};

export type GetCinemasParams = {
  cityId?: number;
  limit?: number;
};
