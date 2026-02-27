export const CLASSIC_YEAR_THRESHOLD = 2000;
export const DEEP_CLASSIC_YEAR_THRESHOLD = 1980;

export const SCREENING_WINDOW_MIN_DAYS = 1;
export const SCREENING_WINDOW_MAX_DAYS = 7;
export const NEARBY_SCREENING_MAX_DAYS = 3;

export const COOLDOWN_HARD_DAYS = 21;
export const COOLDOWN_SOFT_START_DAYS = 22;
export const COOLDOWN_SOFT_END_DAYS = 35;

export const MIN_SCORE = 60;

export const SCORE = {
  SCREENING_NEARBY: 40,
  SCREENING_UPCOMING: 20,
  DEEP_CLASSIC: 20,
  CLASSIC: 10,
  MULTI_CITY: 20,
  MULTI_GENRE: 10,
  SUBTITLED: 10,
  SOFT_COOLDOWN_PENALTY: -30,
} as const;

export type ScoredCandidate = {
  movieId: number;
  screeningId: number;
  score: number;
};
