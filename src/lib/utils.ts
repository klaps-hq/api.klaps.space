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

export const getTodayDateString = (): string =>
  new Date().toISOString().slice(0, 10);

export const pickRandomElement = <T>(array: T[]): T => {
  const index = Math.floor(Math.random() * array.length);
  return array[index]!;
};
