import { cities } from '../database/schemas';
import type {
  ScreeningResponse,
  ScreeningGroupResponse,
} from '../screenings/screenings.types';

export type City = typeof cities.$inferSelect;

export type CityResponse = {
  id: number;
  slug: string;
  name: string;
  nameDeclinated: string;
  population: number | null;
  description: string | null;
  numberOfCinemas?: number;
  /** ISO 8601 UTC; ostatnia zauważalna zmiana treści (max po kinach miasta). */
  updatedAt?: string;
};

export type CityDetailResponse = {
  city: CityResponse;
  screenings: (ScreeningResponse | ScreeningGroupResponse)[];
};
