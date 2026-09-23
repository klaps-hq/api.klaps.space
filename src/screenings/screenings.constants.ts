export const RETRO_YEAR_THRESHOLD = 2026;

/**
 * Look-back window and page size for GET /screenings/recent.
 *
 * Ninety days is long enough to cover a cinema's last few programme cycles
 * (most studio venues rotate monthly) without surfacing titles so old they
 * no longer say anything about what the venue shows. The caps keep a
 * city-wide request for Warsaw from turning into a full-table scan.
 */
export const RECENT_SCREENINGS_DEFAULT_DAYS = 90;
export const RECENT_SCREENINGS_MAX_DAYS = 180;
export const RECENT_SCREENINGS_DEFAULT_LIMIT = 12;
export const RECENT_SCREENINGS_MAX_LIMIT = 48;
