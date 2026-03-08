/**
 * @purpose Admin login endpoint
 * @inputs  AdminLoginRequest { email, password }
 * @outputs AdminLoginResponse { user: { id, email, role, name } } + Set-Cookie header
 * @sideEffects Session CREATE, AuditLog CREATE (login success/failure)
 * @errors  401 (invalid credentials), 429 (rate limited), 400 (validation)
 * @idempotency Not idempotent — creates new session on each call
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  createHandler,
  rateLimit,
  validateBody,
  getParsedBody,
} from '@/server/middleware';
import { AppError } from '@/server/errors';
import { login, getSessionCookieConfig } from '@/server/services/authService';
import { logSecurityEvent, extractClientInfo } from '@/server/services/auditLogService';
import { AdminLoginRequestSchema, type AdminLoginRequest } from '@/schemas/auth.schema';

export const POST = createHandler({
  middleware: [
    rateLimit('auth_login', (req) => {
      try {
        const url = new URL(req.url);
        return url.searchParams.get('email') ?? undefined;
      } catch {
        return undefined;
      }
    }),
    validateBody(AdminLoginRequestSchema),
  ],
  handler: async (req: NextRequest) => {
    const body = getParsedBody<AdminLoginRequest>(req);
    const { ipAddress, userAgent } = extractClientInfo(req);

    try {
      const result = await login(body.email, body.password);

      void logSecurityEvent({
        userId: result.admin.id,
        action: 'admin_login',
        outcome: 'success',
        ipAddress,
        userAgent,
      });

      const cookieConfig = getSessionCookieConfig();
      const response = NextResponse.json({ user: result.admin }, { status: 200 });
      response.cookies.set(cookieConfig.name, result.sessionId, {
        httpOnly: cookieConfig.httpOnly,
        secure: cookieConfig.secure,
        sameSite: cookieConfig.sameSite,
        path: cookieConfig.path,
        maxAge: cookieConfig.maxAge,
      });
      return response;
    } catch (err) {
      void logSecurityEvent({
        action: 'admin_login',
        outcome: 'failure',
        ipAddress,
        userAgent,
        metadata: { email: body.email },
      });
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized('Invalid email or password');
    }
  },
});
