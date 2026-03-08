/**
 * @purpose Session authentication middleware — validates httpOnly cookie
 * @inputs  architect_output/global_middleware_registry.json (auth_session, order 5)
 *          architect_output/global_security_policies.json (authentication)
 * @outputs Populates ctx.admin on success; returns 401 on failure
 * @sideEffects DB read: Session + Admin lookup
 * @errors  401 UNAUTHORIZED if session missing, invalid, or expired
 */
import { NextRequest } from 'next/server';
import type { MiddlewareFn } from './pipeline';
import { validateSession } from '@/server/services/authService';
import { AppError } from '@/server/errors';

export const authSession: MiddlewareFn = async (req: NextRequest, ctx) => {
  const sessionId = req.cookies.get('session')?.value;
  if (!sessionId) {
    throw AppError.unauthorized('Authentication required');
  }

  const admin = await validateSession(sessionId);
  if (!admin) {
    throw AppError.unauthorized('Session expired or invalid');
  }

  ctx.admin = admin;
};
