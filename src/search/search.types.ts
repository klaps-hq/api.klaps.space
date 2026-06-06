import type { CityResponse } from '../cities/cities.types';
import type { CinemaSummaryResponse } from '../cinemas/cinemas.types';

export type SearchResponse = {
  cities: CityResponse[];
  cinemas: CinemaSummaryResponse[];
};
