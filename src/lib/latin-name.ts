import { sql, type AnyColumn, type SQL } from 'drizzle-orm';

/**
 * Person names (directors, screenwriters, actors) come from TMDB credits
 * fetched with language=pl-PL. When TMDB has no Polish entry for a person it
 * returns the name in its original script ("宮崎駿", "عباس کیارستمی",
 * "Андрей Тарковский"), which a Polish reader cannot read and which leaves
 * the director without a readable URL slug.
 */

const LATIN_LETTER = /\p{Script=Latin}/u;
const NON_LATIN_LETTER = /(?!\p{Script=Latin})\p{L}/u;

/** True when the name is written in Latin script only (diacritics allowed). */
export const isLatinName = (name: string): boolean =>
  LATIN_LETTER.test(name) && !NON_LATIN_LETTER.test(name);

/** First candidate written in Latin script, trimmed, or null. */
export const pickLatinName = (
  candidates: readonly (string | null | undefined)[],
): string | null => {
  for (const candidate of candidates) {
    const name = candidate?.trim();
    if (name && isLatinName(name)) return name;
  }
  return null;
};

/**
 * Value for `SET name = ...` in a person upsert: takes the incoming name
 * unless that would replace a readable stored name with one that has no
 * Latin letters at all. Keeps names fixed by
 * scripts/backfill-person-latin-names.ts from being reverted by the next
 * scrape, while any Latin rename from the scraper still goes through.
 * ASCII letters stand in for Latin script here: every Latin-script name has
 * some, and PostgreSQL regexes have no script classes.
 */
export const keepLatinNameSql = (column: AnyColumn): SQL =>
  sql`CASE WHEN excluded."name" ~ '[A-Za-z]' OR ${column} !~ '[A-Za-z]' THEN excluded."name" ELSE ${column} END`;
