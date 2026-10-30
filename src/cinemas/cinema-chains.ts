import { sql, type SQL } from 'drizzle-orm';
import * as schema from '../database/schemas';

/**
 * Multiplex chains, recognised by venue name: Polish chains brand every
 * location with the chain name ("Cinema City Silesia", "Helios Alfa",
 * "Multikino Stary Browar", "Planet Cinema"). The site is about special
 * screenings in studio cinemas, so chain venues are kept out of the sitemap
 * and out of the director and genre statistics.
 *
 * One alternative per chain, written so that it means the same in a JS regex
 * and in a PostgreSQL ARE (only `\s` and `?`). The frontend keeps a twin list
 * in lib/cinema-chains.ts - keep the two in sync.
 *
 * - IMAX: in Poland every IMAX screen sits inside a Cinema City multiplex,
 *   and Filmweb lists those screens as separate venues named just "IMAX".
 * - Planet Cinema (Ełk, Oświęcim) and GO KINO (Oława) are small multiplex
 *   chains that run the same mass reissues as the big three.
 * - Deliberately absent: single-site venues whose names only look like a
 *   brand ("Kinomax" in Inowrocław, "Max Kino", "Centrum 3D", "Kino 3D").
 */
export const CINEMA_CHAIN_NAME_PATTERNS: readonly string[] = [
  'cinema\\s?city',
  'helios',
  'multikino',
  'cinepolis',
  'cinema\\s?3d',
  'imax',
  'planet\\s?cinema',
  'go\\s?kino',
];

const alternatives = CINEMA_CHAIN_NAME_PATTERNS.join('|');

/** JS twin of the SQL pattern, for code paths that already hold the name. */
const CHAIN_NAME_REGEX = new RegExp(`\\b(${alternatives})\\b`, 'i');

/** PostgreSQL word boundaries are \m and \M, not \b. */
export const CINEMA_CHAIN_SQL_PATTERN = `\\m(${alternatives})\\M`;

export const isChainCinemaName = (name: string): boolean =>
  CHAIN_NAME_REGEX.test(name);

/**
 * True for a chain venue. Usable wherever `cinemas` is in scope, including
 * aggregate FILTER clauses after a LEFT JOIN, where the name may be NULL:
 * a screening without a matching cinema row counts as independent.
 */
export const isChainCinema: SQL = sql`coalesce(${schema.cinemas.name} ~* ${CINEMA_CHAIN_SQL_PATTERN}, false)`;

/** Negation of isChainCinema, kept NULL-safe the same way. */
export const isIndependentCinema: SQL = sql`not ${isChainCinema}`;
