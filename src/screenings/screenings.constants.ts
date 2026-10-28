export const RETRO_YEAR_THRESHOLD = 2026;

/**
 * Age at which a film counts as a classic for the `classic` filter (the
 * "klasyka w kinach" landing pages). The scraper only keeps films at least
 * three years old, so the whole catalogue is "not new"; 25 years marks the
 * films people search for as classics. In November 2026 that kept 34 of 64
 * films and 208 of 437 screenings.
 */
export const CLASSIC_MIN_AGE_YEARS = 25;

/**
 * Look-back window and page size for GET /screenings/recent.
 *
 * Ninety days is long enough to cover a cinema's last few programme cycles
 * (most studio venues rotate monthly) without surfacing titles so old they
 * no longer say anything about what the venue shows. The caps keep a
 * city-wide request for Warsaw from turning into a full-table scan.
 */
export const RECENT_SCREENINGS_DEFAULT_DAYS = 90;
// A full year so the open-air pages can show last summer's season in winter.
export const RECENT_SCREENINGS_MAX_DAYS = 365;
export const RECENT_SCREENINGS_DEFAULT_LIMIT = 12;
export const RECENT_SCREENINGS_MAX_LIMIT = 48;
