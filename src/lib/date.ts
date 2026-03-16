const DATE_ONLY_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'Europe/Warsaw',
};

/** Returns today's date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getTodayInPoland = (): string =>
  new Date().toLocaleDateString('sv-SE', DATE_ONLY_OPTIONS);

/** Converts a Date or ISO date string to YYYY-MM-DD (Europe/Warsaw). For PostgreSQL DATE columns. */
export const toDateOnlyString = (value: Date | string): string =>
  value instanceof Date
    ? value.toLocaleDateString('sv-SE', DATE_ONLY_OPTIONS)
    : value.slice(0, 10);

/** Returns a date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getDate = (dateParam?: string): string => {
  return dateParam ?? getTodayInPoland();
};

export const getDatePlusDays = (dateParam: string, days: number): string => {
  const [y, m, d] = dateParam.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
};

/** Returns a date range: defaults to today through 30 days out. */
export const getDateRangeUpToMonthFromNow = (
  dateFrom?: string,
  dateTo?: string,
): {
  startDay: Date;
  endDay: Date;
} => {
  const start = dateFrom ? new Date(dateFrom) : new Date();
  start.setHours(0, 0, 0, 0);

  const end = dateTo ? new Date(dateTo) : new Date(start);
  if (!dateTo) {
    end.setDate(end.getDate() + 30);
  }
  end.setHours(23, 59, 59, 999);

  return { startDay: start, endDay: end };
};

const TIME_START_OF_DAY = ' 00:00:00';
const TIME_END_OF_DAY = ' 23:59:59';
export const getDateRange = (
  dateStr: string,
): {
  startOfDay: string;
  endOfDay: string;
} => ({
  startOfDay: dateStr + TIME_START_OF_DAY,
  endOfDay: dateStr + TIME_END_OF_DAY,
});
