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

export const pickRandomElement = <T>(array: T[]): T => {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
};

/** Returns today's date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getTodayInPoland = (): string =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });

/** Adds one month to a YYYY-MM-DD date string and returns YYYY-MM-DD. */
export const getDatePlusMonth = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  date.setMonth(date.getMonth() + 1);
  return date.toLocaleDateString('sv-SE');
};
