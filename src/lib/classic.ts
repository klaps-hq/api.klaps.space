import { sql, type AnyColumn, type SQL } from 'drizzle-orm';

/**
 * The one definition of a classic across the API: a film screened at least
 * CLASSIC_MIN_AGE_YEARS after its production year, counted from the year of
 * the screening (productionYear <= screeningYear - 25). Backs the `classic`
 * filter of the listings ("klasyka w kinach" pages) and the monthly
 * "Klaps w liczbach" stats.
 *
 * The scraper only keeps films at least three years old, so the whole
 * catalogue is "not new"; 25 years marks the films people search for as
 * classics. In November 2026 that kept 34 of 64 films and 208 of 437
 * screenings.
 */
export const CLASSIC_MIN_AGE_YEARS = 25;

/** Newest production year that is a classic when screened in `screeningYear`. */
export const classicMaxProductionYear = (screeningYear: number): number =>
  screeningYear - CLASSIC_MIN_AGE_YEARS;

export const isClassic = (
  productionYear: number,
  screeningYear: number,
): boolean => productionYear <= classicMaxProductionYear(screeningYear);

/**
 * SQL twin of isClassic. Screening dates are `timestamp without time zone`
 * holding the Polish wall clock, so extracting the year needs no time zone.
 */
export const isClassicSql = (
  productionYear: AnyColumn,
  screeningDate: AnyColumn,
): SQL =>
  sql`${productionYear} <= extract(year from ${screeningDate})::int - ${CLASSIC_MIN_AGE_YEARS}`;
