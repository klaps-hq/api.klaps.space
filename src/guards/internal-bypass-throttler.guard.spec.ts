import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalBypassThrottlerGuard } from './internal-bypass-throttler.guard';
import { INTERNAL_API_KEY_HEADER } from './internal-api-key.guard';

const buildContext = (
  headers: Record<string, string | undefined> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('InternalBypassThrottlerGuard', () => {
  let guard: InternalBypassThrottlerGuard;
  let configGet: jest.Mock;

  beforeEach(() => {
    configGet = jest.fn();
    guard = Object.create(InternalBypassThrottlerGuard.prototype);
    (guard as any).configService = {
      get: configGet,
    } as unknown as ConfigService;
  });

  it('skips throttle when internal key matches', async () => {
    configGet.mockReturnValue('secret-123');
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'secret-123' });

    const result = await guard['shouldSkip'](ctx);
    expect(result).toBe(true);
  });

  it('does not skip when key is wrong', async () => {
    configGet.mockReturnValue('secret-123');
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'wrong' });

    const result = await guard['shouldSkip'](ctx);
    expect(result).toBe(false);
  });

  it('does not skip when header is missing', async () => {
    configGet.mockReturnValue('secret-123');
    const ctx = buildContext({});

    const result = await guard['shouldSkip'](ctx);
    expect(result).toBe(false);
  });

  it('does not skip when INTERNAL_API_KEY is not configured', async () => {
    configGet.mockReturnValue(undefined);
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'anything' });

    const result = await guard['shouldSkip'](ctx);
    expect(result).toBe(false);
  });
});
