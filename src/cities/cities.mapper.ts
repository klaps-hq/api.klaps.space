import type { CityResponse } from './cities.types';

export const mapCity = (
  city: {
    id: number;
    slug: string;
    name: string;
    nameDeclinated: string;
    description?: string | null;
  },
  numberOfCinemas?: number,
): CityResponse => ({
  id: city.id,
  slug: city.slug,
  name: city.name,
  nameDeclinated: city.nameDeclinated,
  description: city.description ?? null,
  ...(numberOfCinemas !== undefined && { numberOfCinemas }),
});
