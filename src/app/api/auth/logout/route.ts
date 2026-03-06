import { NextResponse } from 'next/server';

import { withAuth, type AuthenticatedRequest } from '@/server/auth';
import { db } from '@/server/db';
import { auditLog } from '@/server/security';

async function handler(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    // Get token from cookie or header
    const token =
      request.cookies.get('session')?.value ??
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    // Delete session from database
    if (token) {
      await db.session.deleteMany({
        where: { token },
      });
    }

    // Log logout event
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') ?? undefined;

    await auditLog({
      event: 'LOGOUT',
      userId: request.auth?.userId,
      email: request.auth?.email,
      ip,
      userAgent,
    });

    // Clear cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    // Also clear permission token cookie if exists
    response.cookies.set('permission_token', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

/**
 * Extract IP address from request
 */
function getClientIp(request: AuthenticatedRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export const POST = withAuth(handler);
