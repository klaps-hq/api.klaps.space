import { getPolandDayBounds } from './date';

describe('getPolandDayBounds', () => {
  it('bounds a winter (CET, UTC+1) day', () => {
    expect(getPolandDayBounds('2026-01-15')).toEqual({
      start: new Date('2026-01-14T23:00:00.000Z'),
      end: new Date('2026-01-15T23:00:00.000Z'),
    });
  });

  it('bounds a summer (CEST, UTC+2) day', () => {
    expect(getPolandDayBounds('2026-07-15')).toEqual({
      start: new Date('2026-07-14T22:00:00.000Z'),
      end: new Date('2026-07-15T22:00:00.000Z'),
    });
  });

  it('handles the day clocks go back (25 hours)', () => {
    expect(getPolandDayBounds('2026-10-25')).toEqual({
      start: new Date('2026-10-24T22:00:00.000Z'),
      end: new Date('2026-10-25T23:00:00.000Z'),
    });
  });
});
