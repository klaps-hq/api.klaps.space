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
};

export type CityDetailResponse = {
  city: CityResponse;
  screenings: (ScreeningResponse | ScreeningGroupResponse)[];
};
