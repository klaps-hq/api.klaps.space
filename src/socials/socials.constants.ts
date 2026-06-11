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
  // Filmweb users rating contributes up to this many points, scaled by both
  // the rating itself and how many votes back it, so a widely known 8.0
  // outranks an obscure 8.0 and ties between classics stop being arbitrary.
  RATING_MAX: 25,
  CRITICS_BONUS: 5,
} as const;

// Users rating at or below the baseline scores 0; at or above the ceiling it
// scores the full quality factor.
export const RATING_QUALITY_BASELINE = 5;
export const RATING_QUALITY_CEILING = 8;

// Vote-count confidence saturates at 10^5 (100k votes -> full confidence).
export const RATING_VOTES_CEILING_LOG10 = 5;

// Critics bonus applies only to well-reviewed movies with enough reviews to
// trust the number.
export const CRITICS_BONUS_MIN_RATING = 7;
export const CRITICS_BONUS_MIN_VOTES = 5;
