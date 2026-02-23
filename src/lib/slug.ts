const POLISH_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
  Ą: 'a',
  Ć: 'c',
  Ę: 'e',
  Ł: 'l',
  Ń: 'n',
  Ó: 'o',
  Ś: 's',
  Ź: 'z',
  Ż: 'z',
};

const POLISH_REGEX = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g;

/**
 * Transliterates Polish diacritics and converts text to a URL-safe slug.
 * Only [a-z0-9-] characters are kept.
 */
export const toSlug = (text: string): string =>
  text
    .replace(POLISH_REGEX, (ch) => POLISH_MAP[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Builds a movie slug from title and productionYear. */
export const movieSlug = (title: string, productionYear: number): string =>
  toSlug(`${title}-${productionYear}`);

/**
 * Given a base slug and a set of already-taken slugs, returns a unique
 * variant by appending `-2`, `-3`, … when needed.
 */
export const uniqueSlug = (
  base: string,
  existing: Set<string> | string[],
): string => {
  const taken =
    existing instanceof Set ? existing : new Set<string>(existing);
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
};
