/**
 * @purpose Rate limiting middleware for public endpoints
 * @inputs  architect_output/global_middleware_registry.json (rate_limit, order 4)
 * @outputs void (passes through); 429 response if limit exceeded
 * @sideEffects Updates rate limit counters
 * @errors  429 TOO_MANY_REQUESTS with Retry-After header
 */
import { NextResponse } from 'next/server';
import type { MiddlewareFn } from './pipeline';
import {
  checkLimit,
  getClientIp,
  type RateLimitTier,
} from '@/server/services/rateLimitService';
import { AppError } from '@/server/errors';

export function rateLimit(tier: RateLimitTier, identifierExtractor?: (req: Request) => string | undefined): MiddlewareFn {
  return async (req, _ctx) => {
    const ip = getClientIp(req);
    const identifier = identifierExtractor?.(req);
    const result = checkLimit(tier, ip, identifier);

    if (!result.allowed) {
      const response = NextResponse.json(
        AppError.tooManyRequests().toJSON(),
        { status: 429 }
      );
      response.headers.set('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
      response.headers.set('X-RateLimit-Remaining', '0');
      return response;
    }
    return undefined;
  };
}
