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
  return array[index]!;
};
