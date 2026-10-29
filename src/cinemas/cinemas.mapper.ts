import type { CityResponse } from '../cities/cities.types';
import type {
  CinemaSummaryResponse,
  CinemaResponse,
  CinemaDetailsResponse,
} from './cinemas.types';
import type {
  CinemaAccessibility,
  CinemaPhoto,
  CinemaRoom,
} from '../database/schemas/cinemas.schema';
import { mapCity } from '../cities/cities.mapper';

const EMPTY_CITY: CityResponse = {
  id: 0,
  slug: '',
  name: '',
  nameDeclinated: '',
  population: null,
  description: null,
  voivodeship: null,
};

type DbCinemaWithCity = {
  id: number;
  sourceId: number;
  slug: string;
  name: string;
  street: string | null;
  description?: string | null;
  url: string;
  website?: string | null;
  email?: string | null;
  latitude: number | null;
  longitude: number | null;
  isOpenAir?: boolean;
  phone?: string | null;
  repertoireUrl?: string | null;
  bookingUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  operatorName?: string | null;
  operatorUrl?: string | null;
  screens?: number | null;
  rooms?: CinemaRoom[] | null;
  accessibility?: CinemaAccessibility | null;
  logoUrl?: string | null;
  photos?: CinemaPhoto[] | null;
  city?: {
    id: number;
    slug: string;
    name: string;
    nameDeclinated: string;
    description?: string | null;
  } | null;
};

export const mapCinemaSummary = (
  cinema: DbCinemaWithCity,
  updatedAt?: Date,
  cityUpdatedAt?: Date,
): CinemaSummaryResponse => ({
  id: cinema.id,
  sourceId: cinema.sourceId,
  slug: cinema.slug,
  name: cinema.name,
  street: cinema.street,
  description: cinema.description ?? null,
  city: cinema.city
    ? mapCity(cinema.city, undefined, cityUpdatedAt)
    : EMPTY_CITY,
  isOpenAir: cinema.isOpenAir ?? false,
  ...(updatedAt !== undefined && { updatedAt: updatedAt.toISOString() }),
});

export const mapCinemaDetail = (cinema: DbCinemaWithCity): CinemaResponse => ({
  id: cinema.id,
  sourceId: cinema.sourceId,
  slug: cinema.slug,
  name: cinema.name,
  street: cinema.street,
  description: cinema.description ?? null,
  city: cinema.city ? mapCity(cinema.city) : EMPTY_CITY,
  isOpenAir: cinema.isOpenAir ?? false,
  latitude: cinema.latitude,
  longitude: cinema.longitude,
  filmwebUrl: cinema.url,
  website: cinema.website ?? null,
  email: cinema.email ?? null,
  details: mapCinemaDetails(cinema),
});

export const mapCinemaDetails = (
  cinema: DbCinemaWithCity,
): CinemaDetailsResponse => ({
  phone: cinema.phone ?? null,
  repertoireUrl: cinema.repertoireUrl ?? null,
  bookingUrl: cinema.bookingUrl ?? null,
  facebookUrl: cinema.facebookUrl ?? null,
  instagramUrl: cinema.instagramUrl ?? null,
  operator: cinema.operatorName
    ? { name: cinema.operatorName, url: cinema.operatorUrl ?? null }
    : null,
  screens: cinema.screens ?? null,
  rooms: cinema.rooms ?? [],
  accessibility: cinema.accessibility ?? null,
  logoUrl: cinema.logoUrl ?? null,
  photos: cinema.photos ?? [],
});
