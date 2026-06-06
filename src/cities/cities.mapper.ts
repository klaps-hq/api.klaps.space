import type { CityResponse } from './cities.types';

export const mapCity = (
  city: {
    id: number;
    slug: string;
    name: string;
    nameDeclinated: string;
    population?: number | null;
    description?: string | null;
  },
  numberOfCinemas?: number,
  updatedAt?: Date,
): CityResponse => ({
  id: city.id,
  slug: city.slug,
  name: city.name,
  nameDeclinated: city.nameDeclinated,
  population: city.population ?? null,
  description: city.description ?? null,
  ...(numberOfCinemas !== undefined && { numberOfCinemas }),
  ...(updatedAt !== undefined && { updatedAt: updatedAt.toISOString() }),
});
