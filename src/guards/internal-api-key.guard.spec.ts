import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InternalApiKeyGuard,
  INTERNAL_API_KEY_HEADER,
} from './internal-api-key.guard';

const buildContext = (
  headers: Record<string, string | undefined> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('InternalApiKeyGuard', () => {
  let guard: InternalApiKeyGuard;
  let configGet: jest.Mock;

  beforeEach(() => {
    configGet = jest.fn();
    const configService = { get: configGet } as unknown as ConfigService;
    guard = new InternalApiKeyGuard(configService);
  });

  it('returns true when header matches configured key', () => {
    configGet.mockReturnValue('secret-123');
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'secret-123' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws when INTERNAL_API_KEY is not configured', () => {
    configGet.mockReturnValue(undefined);
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'any' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'Internal API key is not configured',
    );
  });

  it('throws when header is missing', () => {
    configGet.mockReturnValue('secret-123');
    const ctx = buildContext({});

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow('Missing internal API key');
  });

  it('throws when header value is wrong', () => {
    configGet.mockReturnValue('secret-123');
    const ctx = buildContext({ [INTERNAL_API_KEY_HEADER]: 'wrong-key' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow('Invalid internal API key');
  });
});
