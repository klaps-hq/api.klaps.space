import { Logger } from '@nestjs/common';

type DeadlockRetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  label?: string;
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 100;

const logger = new Logger('DeadlockRetry');

/**
 * Checks whether an error is a MySQL deadlock (ER_LOCK_DEADLOCK / errno 1213).
 * Drizzle wraps the mysql2 error inside `cause`, so we check both levels.
 */
const isDeadlockError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  if (
    'code' in error &&
    (error as { code: string }).code === 'ER_LOCK_DEADLOCK'
  ) {
    return true;
  }

  if (
    'cause' in error &&
    error.cause instanceof Error &&
    'code' in error.cause &&
    (error.cause as { code: string }).code === 'ER_LOCK_DEADLOCK'
  ) {
    return true;
  }

  return false;
};

/**
 * Wraps an async operation with automatic retry on MySQL deadlock errors.
 * Uses exponential backoff between attempts.
 *
 * @example
 * ```ts
 * const result = await withDeadlockRetry(
 *   () => this.db.insert(schema.cinemas).values(cinemas).onDuplicateKeyUpdate({ ... }),
 *   { label: 'batchCreateCinemas', maxRetries: 3 },
 * );
 * ```
 */
export const withDeadlockRetry = async <T>(
  operation: () => Promise<T>,
  options?: DeadlockRetryOptions,
): Promise<T> => {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const label = options?.label ?? 'unknown';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (!isDeadlockError(error) || attempt === maxRetries) {
        throw error;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(
        `[${label}] Deadlock on attempt ${attempt}/${maxRetries}, retrying in ${delayMs}ms…`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`[${label}] Exhausted all ${maxRetries} retries`);
};
