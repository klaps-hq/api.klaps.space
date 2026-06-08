import { directorSlug, toSlug, uniqueSlug } from './slug';

describe('toSlug', () => {
  it('transliterates Polish diacritics and lowercases', () => {
    expect(toSlug('Paweł Pawlikowski')).toBe('pawel-pawlikowski');
  });

  it('strips characters outside [a-z0-9-]', () => {
    expect(toSlug('Andrzej Wajda!!!')).toBe('andrzej-wajda');
  });

  it('returns an empty string for names with no latin characters', () => {
    expect(toSlug('김기덕')).toBe('');
    expect(toSlug('宮崎駿')).toBe('');
  });
});

describe('directorSlug', () => {
  it('uses the transliterated name when available', () => {
    expect(directorSlug('Paweł Pawlikowski', 555)).toBe('pawel-pawlikowski');
  });

  it('falls back to rezyser-<sourceId> for non-latin names', () => {
    expect(directorSlug('김기덕', 1188)).toBe('rezyser-1188');
    expect(directorSlug('宮崎駿', 608)).toBe('rezyser-608');
    expect(directorSlug('Андрей Тарковский', 8452)).toBe('rezyser-8452');
  });

  it('never yields an empty slug', () => {
    expect(directorSlug('', 42)).toBe('rezyser-42');
  });
});

describe('uniqueSlug', () => {
  it('returns the base when not taken', () => {
    expect(uniqueSlug('pawel-pawlikowski', new Set())).toBe(
      'pawel-pawlikowski',
    );
  });

  it('appends an incrementing suffix on collision', () => {
    const taken = new Set(['rezyser-608']);
    expect(uniqueSlug('rezyser-608', taken)).toBe('rezyser-608-2');
  });
});
