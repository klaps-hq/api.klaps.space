import { PgDialect } from 'drizzle-orm/pg-core';
import * as schema from '../database/schemas';
import { isLatinName, keepLatinNameSql, pickLatinName } from './latin-name';

describe('isLatinName', () => {
  it.each([
    'Abbas Kiarostami',
    'Paweł Pawlikowski',
    'Lee Chang-dong',
    'Apichatpong Weerasethakul',
    'Wong Kar-wai',
  ])('accepts "%s"', (name) => {
    expect(isLatinName(name)).toBe(true);
  });

  it.each([
    'عباس کیارستمی',
    '宮崎駿',
    '박찬욱',
    'Андрей Тарковский',
    'Γιώργος Λάνθιμος',
    'เป็นเอก รัตนเรือง',
    // Mixed scripts are not readable either.
    'Hayao 宮崎駿',
    '',
    '  ',
  ])('rejects "%s"', (name) => {
    expect(isLatinName(name)).toBe(false);
  });
});

describe('pickLatinName', () => {
  it('returns the first Latin-script candidate, trimmed', () => {
    expect(
      pickLatinName([
        null,
        'عباس کیارستمی',
        ' Abbas Kiarostami ',
        'Kiarostami',
      ]),
    ).toBe('Abbas Kiarostami');
  });

  it('returns null when no candidate is Latin', () => {
    expect(pickLatinName(['宮崎駿', undefined, 'みやざき はやお'])).toBeNull();
  });
});

describe('keepLatinNameSql', () => {
  it('keeps the stored name only when the incoming one has no Latin letters', () => {
    const { sql } = new PgDialect().sqlToQuery(
      keepLatinNameSql(schema.directors.name),
    );

    expect(sql).toBe(
      `CASE WHEN excluded."name" ~ '[A-Za-z]' OR "directors"."name" !~ '[A-Za-z]' THEN excluded."name" ELSE "directors"."name" END`,
    );
  });
});
