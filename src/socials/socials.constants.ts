export const CLASSIC_YEAR_THRESHOLD = 2000;
export const DEEP_CLASSIC_YEAR_THRESHOLD = 1980;

// A movie already posted on a platform within this window is excluded from
// new candidates, so consecutive posts never repeat the same movie.
export const REPEAT_COOLDOWN_DAYS = 30;

export const SCORE = {
  DEEP_CLASSIC: 30,
  CLASSIC: 20,
  NORMAL_YEAR: 10,
  MULTI_CITY: 20,
  MULTI_GENRE: 10,
} as const;
