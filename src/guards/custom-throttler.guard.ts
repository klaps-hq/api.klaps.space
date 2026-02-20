import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { INTERNAL_API_KEY_HEADER } from './internal-api-key.guard';

/**
 * Skips rate limiting for requests carrying a valid internal API key
 * (trusted scraper / internal services). All other traffic is throttled normally.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers[INTERNAL_API_KEY_HEADER];
    const expectedKey = process.env.INTERNAL_API_KEY;

    return !!expectedKey && providedKey === expectedKey;
  }
}
