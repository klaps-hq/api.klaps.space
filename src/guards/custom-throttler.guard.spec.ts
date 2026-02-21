import { ExecutionContext } from '@nestjs/common';
import { CustomThrottlerGuard } from './custom-throttler.guard';
import { INTERNAL_API_KEY_HEADER } from './internal-api-key.guard';

const buildContext = (
  headers: Record<string, string | undefined> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('CustomThrottlerGuard', () => {
  let guard: CustomThrottlerGuard;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    guard = Object.create(CustomThrottlerGuard.prototype);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('skips throttle when internal key matches', async () => {
    process.env.INTERNAL_API_KEY = 'secret-123';
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'secret-123' });

    const result = await guard['shouldSkip'](ctx);
    expect(result).toBe(true);
  });

  it('does not skip when key is wrong', async () => {
    process.env.INTERNAL_API_KEY = 'secret-123';
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'wrong' });

    const result = await guard['shouldSkip'](ctx);
    expect(result).toBe(false);
  });

  it('does not skip when header is missing', async () => {
    process.env.INTERNAL_API_KEY = 'secret-123';
    const ctx = buildContext({});

    const result = await guard['shouldSkip'](ctx);
    expect(result).toBe(false);
  });

  it('does not skip when env var is not set', async () => {
    delete process.env.INTERNAL_API_KEY;
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'anything' });

    const result = await guard['shouldSkip'](ctx);
    expect(result).toBe(false);
  });
});
