/**
 * @purpose Sliding-window rate limiting with configurable tiers
 * @inputs  architect_output/global_services_registry.json (rateLimitService)
 *          architect_output/global_middleware_registry.json (rate_limit tiers)
 * @outputs checkLimit(): allow/deny decision with remaining quota
 * @sideEffects In-memory counter updates (production: replace with Redis)
 * @errors  None — always returns a result, never throws
 * @idempotency Each call increments counter; not idempotent by design
 */

export type RateLimitTier =
  | 'auth_login'
  | 'auth_recovery'
  | 'auth_reset'
  | 'public_read'
  | 'public_write'
  | 'coupon_check';

type TierConfig = {
  windowMs: number;
  maxRequests: number;
  scope: 'ip' | 'ip+email';
};

const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  auth_login:    { windowMs: 900_000, maxRequests: 5,  scope: 'ip+email' },
  auth_recovery: { windowMs: 900_000, maxRequests: 3,  scope: 'ip' },
  auth_reset:    { windowMs: 900_000, maxRequests: 5,  scope: 'ip' },
  public_read:   { windowMs: 60_000,  maxRequests: 60, scope: 'ip' },
  public_write:  { windowMs: 900_000, maxRequests: 5,  scope: 'ip' },
  coupon_check:  { windowMs: 60_000,  maxRequests: 30, scope: 'ip' },
};

type WindowEntry = { timestamps: number[] };

// In-memory store. Production: swap for Redis-backed implementation.
const store = new Map<string, WindowEntry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

/**
 * @purpose Check and record a rate limit hit for a given scope key
 * @inputs  tier, ip, optional identifier (email for ip+email scopes)
 * @outputs RateLimitResult with allow/deny, remaining, retryAfter
 * @sideEffects Updates in-memory counter
 */
export function checkLimit(
  tier: RateLimitTier,
  ip: string,
  identifier?: string
): RateLimitResult {
  const config = TIER_CONFIGS[tier];
  const scopeKey =
    config.scope === 'ip+email' && identifier
      ? `${tier}:${ip}:${identifier}`
      : `${tier}:${ip}`;

  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(scopeKey);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(scopeKey, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0] ?? now;
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 0),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * @purpose Get client IP from request headers
 * @inputs  Request object
 * @outputs IP string
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

// Periodic cleanup of expired entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > now - 900_000);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}
