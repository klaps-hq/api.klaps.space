/** Returns today's date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getTodayInPoland = (): string =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });

/** Returns a date as YYYY-MM-DD in the Europe/Warsaw (CET/CEST) timezone. */
export const getDate = (dateParam?: string): string => {
  return dateParam ?? getTodayInPoland();
};

export const getDatePlusDays = (dateParam: string, days: number): string => {
  const [y, m, d] = dateParam.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
};
