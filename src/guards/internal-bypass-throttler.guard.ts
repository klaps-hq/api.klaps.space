import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { INTERNAL_API_KEY_HEADER } from './internal-api-key.guard';

/**
 * Skips rate limiting for requests carrying a valid internal API key
 * (trusted scraper / internal services). All other traffic is throttled normally.
 */
@Injectable()
export class InternalBypassThrottlerGuard extends ThrottlerGuard {
  @Inject()
  private readonly configService!: ConfigService;

  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers[INTERNAL_API_KEY_HEADER];
    const expectedKey = this.configService.get<string>('INTERNAL_API_KEY');

    return Promise.resolve(!!expectedKey && providedKey === expectedKey);
  }
}
