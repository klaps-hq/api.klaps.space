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

/** Returns a date range: defaults to today through 30 days out (YYYY-MM-DD HH:mm:ss). */
export const getDateRangeUpToMonthFromNow = (
  dateFrom?: string,
  dateTo?: string,
): {
  startDay: string;
  endDay: string;
} => {
  const start = dateFrom ? new Date(dateFrom) : new Date();
  const startDay = start.toISOString().slice(0, 10);

  if (dateTo) {
    return { startDay, endDay: dateTo + TIME_END_OF_DAY };
  }

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 30);
  const endDay = endDate.toISOString().slice(0, 10) + TIME_END_OF_DAY;

  return { startDay, endDay };
};

export const pickRandomElement = <T>(array: T[]): T => {
  const index = Math.floor(Math.random() * array.length);
  return array[index]!;
};
