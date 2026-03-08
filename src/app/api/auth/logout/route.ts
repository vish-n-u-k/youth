/**
 * @purpose Admin logout endpoint
 * @inputs  Authenticated admin session (cookie)
 * @outputs { message: "Logged out successfully" } + cleared session cookie
 * @sideEffects Session DELETE, AuditLog CREATE (logout)
 * @errors  401 (unauthenticated)
 * @idempotency Safe to call multiple times — missing session is not an error
 */
import { NextResponse } from 'next/server';
import {
  createHandler,
  authSession,
  auditAction,
} from '@/server/middleware';
import { logout, getSessionCookieConfig } from '@/server/services/authService';

export const POST = createHandler({
  middleware: [
    authSession,
    auditAction({ action: 'admin_logout', security: true }),
  ],
  handler: async (req) => {
    const sessionId = req.cookies.get('session')?.value;
    if (sessionId) {
      await logout(sessionId);
    }

    const cookieConfig = getSessionCookieConfig();
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
    response.cookies.set(cookieConfig.name, '', {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: cookieConfig.path,
      maxAge: 0,
    });
    return response;
  },
});
