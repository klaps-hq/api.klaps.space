/**
 * Open-air venues are only recognisable by name: Filmweb lists each summer
 * series stop as its own "cinema" ("TME Polówka: Park Julianowski",
 * "Filmowa Stolica Lata: Ogród Saski", "Kino Letnie w Orłowie"). The name
 * check runs once, when a cinema is created or backfilled, and the result is
 * stored in `cinemas.isOpenAir`, so readers filter on a column and a wrong
 * guess can be fixed by hand without the scraper undoing it.
 *
 * No word boundary after a Polish letter: JS regexes treat "ą" as a non-word
 * character, so a trailing boundary there would never match.
 */
const OPEN_AIR_NAME_PATTERNS: readonly RegExp[] = [
  /\bpolówk[ai]/i,
  /\bfilmowa stolica lata\b/i,
  /\bkino letnie\b/i,
  /\bkino plenerowe\b/i,
  /\bkino pod chmurką/i,
  /\bkino na sadach\b/i,
];

export const isOpenAirCinemaName = (name: string): boolean =>
  OPEN_AIR_NAME_PATTERNS.some((pattern) => pattern.test(name));
