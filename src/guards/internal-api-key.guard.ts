import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/** Header name for the internal API key (case-insensitive; Express normalizes to lowercase). */
export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';

/**
 * Guard that allows access only when the request includes a valid internal API key
 * in the x-internal-api-key header, matching the INTERNAL_API_KEY environment variable.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers[INTERNAL_API_KEY_HEADER];
    const expectedKey = this.configService.get<string>('INTERNAL_API_KEY');
    if (!expectedKey) {
      throw new UnauthorizedException('Internal API key is not configured');
    }
    if (!providedKey || typeof providedKey !== 'string') {
      throw new UnauthorizedException('Missing internal API key');
    }
    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return true;
  }
}
