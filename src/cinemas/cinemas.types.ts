import type { CityResponse } from '../cities/cities.types';
import type {
  CinemaAccessibility,
  CinemaPhoto,
  CinemaRoom,
} from '../database/schemas/cinemas.schema';

export type CinemaSummaryResponse = {
  id: number;
  sourceId: number;
  slug: string;
  name: string;
  street: string | null;
  description: string | null;
  city: CityResponse;
  isOpenAir: boolean;
  /** Only in the GET /cinemas list (map in the admin panel). */
  latitude?: number | null;
  longitude?: number | null;
  /** ISO 8601 UTC; ostatnia zauważalna zmiana treści (kino lub jego seanse). */
  updatedAt?: string;
  /** Venue details; only when the list is filtered by city. */
  details?: CinemaDetailsResponse;
};

export type CinemaResponse = {
  id: number;
  sourceId: number;
  slug: string;
  name: string;
  street: string | null;
  description: string | null;
  city: CityResponse;
  isOpenAir: boolean;
  latitude: number | null;
  longitude: number | null;
  filmwebUrl: string;
  /** The cinema's own official website, when known; null otherwise. */
  website: string | null;
  /** Contact email, when known; null otherwise. */
  email: string | null;
  /** Researched venue details; every field null when unknown. */
  details: CinemaDetailsResponse;
};

export type CinemaDetailsResponse = {
  phone: string | null;
  repertoireUrl: string | null;
  bookingUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  operator: { name: string; url: string | null } | null;
  screens: number | null;
  rooms: CinemaRoom[];
  accessibility: CinemaAccessibility | null;
  logoUrl: string | null;
  photos: CinemaPhoto[];
};
