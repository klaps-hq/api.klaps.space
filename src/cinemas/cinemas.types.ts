import type { CityResponse } from '../cities/cities.types';

export type CinemaSummaryResponse = {
  id: number;
  sourceId: number;
  slug: string;
  name: string;
  street: string | null;
  description: string | null;
  city: CityResponse;
  /** ISO 8601 UTC; ostatnia zauważalna zmiana treści (kino lub jego seanse). */
  updatedAt?: string;
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
