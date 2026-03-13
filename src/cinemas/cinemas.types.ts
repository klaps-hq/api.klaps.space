import type { CityResponse } from '../cities/cities.types';

export type CinemaSummaryResponse = {
  id: number;
  sourceId: number;
  slug: string;
  name: string;
  street: string | null;
  city: CityResponse;
};

export type CinemaResponse = {
  id: number;
  sourceId: number;
  slug: string;
  name: string;
  street: string | null;
  description: string | null;
  city: CityResponse;
  latitude: number | null;
  longitude: number | null;
  filmwebUrl: string;
};
