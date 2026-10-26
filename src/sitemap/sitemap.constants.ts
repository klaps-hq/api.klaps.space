import { RECENT_SCREENINGS_DEFAULT_DAYS } from '../screenings/screenings.constants';

/**
 * Minimum number of upcoming screenings a director must have to be listed in
 * the sitemap. Kept in sync with the frontend's `noindex` threshold so pages
 * below it are never advertised for indexing.
 */
export const DIRECTOR_INDEX_THRESHOLD = 3;

/**
 * Look-back window, in days, that keeps a cinema or city in the sitemap: it
 * needs a screening dated within it or later. Matches the frontend, which
 * marks the page `noindex` when it has neither upcoming screenings nor any
 * for its 'Ostatnio w repertuarze' section (RECENT_SCREENINGS_DEFAULT_DAYS).
 */
export const VENUE_ACTIVITY_WINDOW_DAYS = RECENT_SCREENINGS_DEFAULT_DAYS;
