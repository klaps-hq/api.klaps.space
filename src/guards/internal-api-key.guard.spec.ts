import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  InternalApiKeyGuard,
  INTERNAL_API_KEY_HEADER,
} from './internal-api-key.guard';

const createMockContext = (
  headers: Record<string, string | undefined> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  }) as unknown as ExecutionContext;

describe('InternalApiKeyGuard', () => {
  let guard: InternalApiKeyGuard;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InternalApiKeyGuard,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get(InternalApiKeyGuard);
    configService = module.get(ConfigService);
  });

  it('should allow request with valid API key', () => {
    configService.get.mockReturnValue('secret-key');
    const ctx = createMockContext({
      [INTERNAL_API_KEY_HEADER]: 'secret-key',
    });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw when INTERNAL_API_KEY env var is not configured', () => {
    configService.get.mockReturnValue(undefined);
    const ctx = createMockContext({
      [INTERNAL_API_KEY_HEADER]: 'any-key',
    });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow(
      'Internal API key is not configured',
    );
  });

  it('should throw when header is missing', () => {
    configService.get.mockReturnValue('secret-key');
    const ctx = createMockContext({});

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow('Missing internal API key');
  });

  it('should throw when header value is wrong', () => {
    configService.get.mockReturnValue('secret-key');
    const ctx = createMockContext({
      [INTERNAL_API_KEY_HEADER]: 'wrong-key',
    });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow('Invalid internal API key');
  });
});
