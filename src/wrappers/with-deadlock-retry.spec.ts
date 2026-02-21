import { withDeadlockRetry } from './with-deadlock-retry';

const makeDeadlockError = (nested = false): Error => {
  if (nested) {
    const cause = Object.assign(new Error('deadlock'), { code: 'ER_LOCK_DEADLOCK' });
    return Object.assign(new Error('DrizzleQueryError'), { cause });
  }
  return Object.assign(new Error('deadlock'), { code: 'ER_LOCK_DEADLOCK' });
};

describe('withDeadlockRetry', () => {
  it('returns result on first successful try', async () => {
    const op = jest.fn().mockResolvedValue('ok');

    const result = await withDeadlockRetry(op, { label: 'test' });

    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on direct ER_LOCK_DEADLOCK and succeeds', async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(makeDeadlockError())
      .mockResolvedValue('ok');

    const result = await withDeadlockRetry(op, {
      label: 'test',
      maxRetries: 3,
      baseDelayMs: 1,
    });

    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('retries on nested (cause) ER_LOCK_DEADLOCK', async () => {
    const op = jest
      .fn()
      .mockRejectedValueOnce(makeDeadlockError(true))
      .mockResolvedValue('ok');

    const result = await withDeadlockRetry(op, {
      label: 'test',
      maxRetries: 3,
      baseDelayMs: 1,
    });

    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries', async () => {
    const op = jest.fn().mockRejectedValue(makeDeadlockError());

    await expect(
      withDeadlockRetry(op, { label: 'test', maxRetries: 2, baseDelayMs: 1 }),
    ).rejects.toThrow('deadlock');

    expect(op).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on non-deadlock error without retrying', async () => {
    const op = jest.fn().mockRejectedValue(new Error('connection refused'));

    await expect(
      withDeadlockRetry(op, { label: 'test', maxRetries: 3, baseDelayMs: 1 }),
    ).rejects.toThrow('connection refused');

    expect(op).toHaveBeenCalledTimes(1);
  });
});
