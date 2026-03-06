import { NextResponse } from 'next/server';
import { z } from 'zod';

import { security } from '@/config/security';
import { verifyPassword, createSessionToken } from '@/server/auth';
import { db } from '@/server/db';
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitHeaders,
  checkLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  auditLog,
} from '@/server/security';

import type { NextRequest } from 'next/server';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Extract IP address from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  try {
    // Check rate limit first
    const rateLimit = checkRateLimit(ip, 'login');
    if (!rateLimit.allowed) {
      await auditLog({
        event: 'LOGIN_FAILED',
        ip,
        userAgent,
        metadata: { reason: 'rate_limited', retryAfterMs: rateLimit.retryAfterMs },
      });

      const response = NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfterMs: rateLimit.retryAfterMs,
        },
        { status: 429 }
      );

      // Add rate limit headers
      const headers = getRateLimitHeaders(ip, 'login');
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }

      return response;
    }

    const body: unknown = await request.json();
    const data = loginSchema.parse(body);

    // Check account lockout
    const lockout = await checkLockout(data.email);
    if (lockout.isLocked) {
      await auditLog({
        event: 'LOGIN_FAILED',
        email: data.email,
        ip,
        userAgent,
        metadata: { reason: 'account_locked', lockedUntil: lockout.lockedUntil },
      });

      return NextResponse.json(
        {
          error: 'Account is temporarily locked. Please try again later.',
          lockedUntil: lockout.lockedUntil,
        },
        { status: 423 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user) {
      // Record failed attempt for non-existent user too (prevents enumeration timing attacks)
      await recordFailedAttempt(data.email);
      await auditLog({
        event: 'LOGIN_FAILED',
        email: data.email,
        ip,
        userAgent,
        metadata: { reason: 'user_not_found' },
      });

      return buildFailedLoginResponse(lockout.remainingAttempts - 1);
    }

    // Verify password
    const isValid = await verifyPassword(data.password, user.password);
    if (!isValid) {
      const newLockout = await recordFailedAttempt(data.email);

      if (newLockout.isLocked) {
        await auditLog({
          event: 'ACCOUNT_LOCKED',
          userId: user.id,
          email: data.email,
          ip,
          userAgent,
          metadata: { lockedUntil: newLockout.lockedUntil },
        });
      }

      await auditLog({
        event: 'LOGIN_FAILED',
        userId: user.id,
        email: data.email,
        ip,
        userAgent,
        metadata: { reason: 'invalid_password', failedAttempts: newLockout.failedAttempts },
      });

      return buildFailedLoginResponse(newLockout.remainingAttempts);
    }

    // Success - clear failed attempts and rate limit
    await clearFailedAttempts(user.id);
    resetRateLimit(ip, 'login');

    // Create session token
    const token = await createSessionToken(user.id, user.email);

    // Store session in database
    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Log successful login
    await auditLog({
      event: 'LOGIN_SUCCESS',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

/**
 * Build consistent failed login response
 */
function buildFailedLoginResponse(remainingAttempts: number): NextResponse {
  const response: Record<string, unknown> = {
    error: 'Invalid email or password',
  };

  // Optionally show remaining attempts
  if (security.lockout.enabled && security.lockout.showRemainingAttempts) {
    response.remainingAttempts = remainingAttempts;
  }

  return NextResponse.json(response, { status: 401 });
}
