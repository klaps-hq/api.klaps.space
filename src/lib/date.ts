/** Returns today's date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getTodayInPoland = (): string =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });

/** Returns a date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getDate = (dateParam: string): string => {
  return dateParam ?? new Date().toISOString().slice(0, 10);
};
