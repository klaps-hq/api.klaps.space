/** Returns today's date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getTodayInPoland = (): string =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });

/** Returns a date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getDate = (dateParam?: string): string => {
  return dateParam ?? getTodayInPoland();
};

export const getDatePlusDays = (dateParam: string, days: number): string => {
  const date = new Date(dateParam);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
};
