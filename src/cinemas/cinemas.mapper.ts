import type { CityResponse } from '../cities/cities.types';
import type { CinemaSummaryResponse, CinemaResponse } from './cinemas.types';
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
  latitude: number | null;
  longitude: number | null;
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
  latitude: cinema.latitude,
  longitude: cinema.longitude,
  filmwebUrl: cinema.url,
  website: cinema.website ?? null,
});
