import {
  getDateRange,
  getDateRangeUpToMonthFromNow,
  pickRandomElement,
  getTodayInPoland,
  getDatePlusMonth,
} from './utils';

describe('utils', () => {
  describe('getDateRange', () => {
    it('appends start and end of day times', () => {
      const result = getDateRange('2024-08-15');

      expect(result.startOfDay).toBe('2024-08-15 00:00:00');
      expect(result.endOfDay).toBe('2024-08-15 23:59:59');
    });
  });

  describe('getDateRangeUpToMonthFromNow', () => {
    it('defaults to today through 30 days out', () => {
      const { startDay, endDay } = getDateRangeUpToMonthFromNow();

      expect(startDay).toBeInstanceOf(Date);
      expect(endDay).toBeInstanceOf(Date);
      expect(endDay.getTime()).toBeGreaterThan(startDay.getTime());
    });

    it('uses provided dateFrom and dateTo', () => {
      const { startDay, endDay } = getDateRangeUpToMonthFromNow(
        '2024-01-01',
        '2024-06-30',
      );

      expect(startDay.getFullYear()).toBe(2024);
      expect(startDay.getMonth()).toBe(0);
      expect(endDay.getMonth()).toBe(5);
    });

    it('defaults dateTo to 30 days from dateFrom', () => {
      const { startDay, endDay } = getDateRangeUpToMonthFromNow('2024-01-01');

      expect(startDay.getMonth()).toBe(0);
      const diffMs = endDay.getTime() - startDay.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(30);
      expect(diffDays).toBeLessThan(32);
    });
  });

  describe('pickRandomElement', () => {
    it('returns an element from the array', () => {
      const arr = [10, 20, 30];
      const result = pickRandomElement(arr);

      expect(arr).toContain(result);
    });

    it('returns the only element for single-item array', () => {
      expect(pickRandomElement([42])).toBe(42);
    });
  });

  describe('getTodayInPoland', () => {
    it('returns a YYYY-MM-DD string', () => {
      const result = getTodayInPoland();

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getDatePlusMonth', () => {
    it('adds one month to a date string', () => {
      const result = getDatePlusMonth('2024-01-15');

      expect(result).toBe('2024-02-15');
    });

    it('handles year boundary', () => {
      const result = getDatePlusMonth('2024-12-15');

      expect(result).toBe('2025-01-15');
    });
  });
});
