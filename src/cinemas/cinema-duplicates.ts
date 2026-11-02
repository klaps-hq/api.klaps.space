import { isNull, type SQL } from 'drizzle-orm';
import * as schema from '../database/schemas';

/**
 * True for cinemas that are not an operator/venue duplicate of another row.
 *
 * Filmweb sometimes lists one place twice: under the operator ("Centrum
 * Kultury i Sztuki") and under the venue ("Polonez"). The extra row gets
 * `duplicateOfId` pointing at the canonical cinema (set by
 * scripts/fix-cinema-data.ts, never by the scraper). Duplicates stay
 * reachable by slug, so old links keep working and the page can point at the
 * canonical cinema, but they are left out of city lists, cinema counts,
 * search and the sitemap.
 */
export const isCanonicalCinema: SQL = isNull(schema.cinemas.duplicateOfId);
