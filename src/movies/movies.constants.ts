export const PAGINATION = {
  DEFAULT_LIMIT: 20,
} as const;

export const MULTI_CITY = {
  DEFAULT_LIMIT: 5,
  MIN_CITIES: 2,
} as const;

export const CACHE_TTL = {
  MULTI_CITY_MS: 900_000, // 15 minutes
} as const;
