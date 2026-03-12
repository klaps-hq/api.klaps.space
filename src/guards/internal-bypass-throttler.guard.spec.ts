import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_API_KEY_HEADER } from './internal-api-key.guard';
import { InternalBypassThrottlerGuard } from './internal-bypass-throttler.guard';

const createMockContext = (
  headers: Record<string, string | undefined> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('InternalBypassThrottlerGuard', () => {
  let guard: InternalBypassThrottlerGuard;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    guard = Object.create(InternalBypassThrottlerGuard.prototype);
    configService = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;
    (guard as any).configService = configService;
  });

  it('should skip throttling when valid internal key is provided', async () => {
    configService.get.mockReturnValue('secret-key');
    const ctx = createMockContext({
      [INTERNAL_API_KEY_HEADER]: 'secret-key',
    });

    await expect(guard['shouldSkip'](ctx)).resolves.toBe(true);
  });

  it('should not skip throttling when key is missing', async () => {
    configService.get.mockReturnValue('secret-key');
    const ctx = createMockContext({});

    await expect(guard['shouldSkip'](ctx)).resolves.toBe(false);
  });

  it('should not skip throttling when key is wrong', async () => {
    configService.get.mockReturnValue('secret-key');
    const ctx = createMockContext({
      [INTERNAL_API_KEY_HEADER]: 'wrong-key',
    });

    await expect(guard['shouldSkip'](ctx)).resolves.toBe(false);
  });

  it('should not skip throttling when env var is not configured', async () => {
    configService.get.mockReturnValue(undefined);
    const ctx = createMockContext({
      [INTERNAL_API_KEY_HEADER]: 'any-key',
    });

    await expect(guard['shouldSkip'](ctx)).resolves.toBe(false);
  });
});
