// ============================================
// RATE LIMITING
// ============================================
// In-memory rate limiting with sliding window.
// For production at scale, consider Redis-based rate limiting.

import { security } from '@/config/security';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000); // Clean every minute

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number | null;
}

/**
 * Check rate limit for a given identifier and type
 * @param identifier - IP address, user ID, or other unique identifier
 * @param type - 'login' or 'api' to use different limits
 */
export function checkRateLimit(
  identifier: string,
  type: 'login' | 'api' = 'api'
): RateLimitResult {
  if (!security.rateLimit.enabled) {
    return { allowed: true, remaining: Infinity, retryAfterMs: null };
  }

  const config = security.rateLimit[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.maxAttempts - entry.count);
  const allowed = entry.count <= config.maxAttempts;

  return {
    allowed,
    remaining,
    retryAfterMs: allowed ? null : entry.resetAt - now,
  };
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export function resetRateLimit(identifier: string, type: 'login' | 'api' = 'api'): void {
  const key = `${type}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  identifier: string,
  type: 'login' | 'api' = 'api'
): Record<string, string> {
  if (!security.rateLimit.enabled) {
    return {};
  }

  const config = security.rateLimit[type];
  const key = `${type}:${identifier}`;
  const entry = rateLimitStore.get(key);

  const remaining = entry ? Math.max(0, config.maxAttempts - entry.count) : config.maxAttempts;
  const reset = entry ? Math.ceil(entry.resetAt / 1000) : Math.ceil((Date.now() + config.windowMs) / 1000);

  return {
    'X-RateLimit-Limit': String(config.maxAttempts),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  };
}
