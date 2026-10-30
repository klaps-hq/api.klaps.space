import { PgDialect } from 'drizzle-orm/pg-core';
import * as schema from '../database/schemas';
import {
  CLASSIC_MIN_AGE_YEARS,
  classicMaxProductionYear,
  isClassic,
  isClassicSql,
} from './classic';

describe('classic definition', () => {
  it('counts 25 years back from the screening year', () => {
    expect(CLASSIC_MIN_AGE_YEARS).toBe(25);
    expect(classicMaxProductionYear(2026)).toBe(2001);
  });

  it.each([
    [2001, 2026, true],
    [2002, 2026, false],
    [1999, 2026, true],
    [2001, 2025, false],
    [2002, 2027, true],
  ])(
    'film from %i screened in %i is a classic: %s',
    (made, screened, expected) => {
      expect(isClassic(made, screened)).toBe(expected);
    },
  );

  it('compares against the year of each screening in SQL', () => {
    const { sql, params } = new PgDialect().sqlToQuery(
      isClassicSql(schema.movies.productionYear, schema.screenings.date),
    );

    expect(sql).toBe(
      '"movies"."productionYear" <= extract(year from "screenings"."date")::int - $1',
    );
    expect(params).toEqual([25]);
  });
});
