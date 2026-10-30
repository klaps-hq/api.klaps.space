export const RETRO_YEAR_THRESHOLD = 2026;

// The classic definition (25 years before the screening year) lives in
// lib/classic.ts, shared with the monthly stats in the socials module.

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
