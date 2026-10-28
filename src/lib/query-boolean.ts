import { Transform } from 'class-transformer';

/**
 * Parses a query-string flag. Only "true" and "1" enable it: a plain
 * `Boolean("false")` would be true, which is the usual trap with query DTOs.
 */
export const QueryBoolean = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === null || value === '') return undefined;
    return value === 'true' || value === '1';
  });
