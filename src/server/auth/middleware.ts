// ============================================
// AUTH MIDDLEWARE
// ============================================

import { NextResponse } from 'next/server';

import { ROUTE_PERMISSIONS } from '@/config/route-permissions';
import { satisfiesRequirement } from '@/lib/permissions/matcher';
import { resolveUserPermissions } from '@/lib/permissions/resolver';
import { findRoutePermission } from '@/lib/permissions/route-matcher';
import { db } from '@/server/db';

import { verifySessionToken } from './jwt';


import type { UserAuthContext } from '@/lib/permissions/types';
import type { NextRequest} from 'next/server';

export interface AuthenticatedRequest extends NextRequest {
  auth?: UserAuthContext;
}

type RouteHandler = (
  req: AuthenticatedRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wrap a route handler with authentication and authorization
 *
 * @example
 * export const GET = withAuth(async (req) => {
 *   const { auth } = req;
 *   return NextResponse.json({ userId: auth.userId });
 * });
 */
export function withAuth(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const method = request.method;
    const path = new URL(request.url).pathname;

    // 1. Find route in registry
    const entry = findRoutePermission(ROUTE_PERMISSIONS, method, path);
    if (!entry) {
      // Route not registered - deny by default (secure by default)
      return NextResponse.json(
        { error: 'Route not registered in permission registry' },
        { status: 404 }
      );
    }

    // 2. Public route - no auth needed
    if (entry.permission === null) {
      return handler(request as AuthenticatedRequest, context);
    }

    // 3. Extract token from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '') ?? request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 4. Validate token
    const payload = await verifySessionToken(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // 5. Get user from database
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 6. Get organization context (from header, query, or cookie)
    const organizationId =
      request.headers.get('x-organization-id') ??
      new URL(request.url).searchParams.get('org') ??
      request.cookies.get('organization')?.value ??
      undefined;

    // 7. Handle "authenticated" (any logged-in user)
    if (entry.permission === 'authenticated') {
      const authReq = request as AuthenticatedRequest;
      authReq.auth = {
        userId: user.id,
        email: user.email,
        organizationId,
        roles: [],
        permissions: [],
      };
      return handler(authReq, context);
    }

    // 8. Resolve permissions from roles + direct grants
    const resolved = await resolveUserPermissions(user.id, organizationId);

    // 9. Check permission requirement
    if (!satisfiesRequirement(resolved.permissions, entry.permission)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
          required: entry.permission,
          yourRoles: resolved.roles,
        },
        { status: 403 }
      );
    }

    // 10. Attach context & continue
    const authReq = request as AuthenticatedRequest;
    authReq.auth = {
      userId: user.id,
      email: user.email,
      organizationId,
      roles: resolved.roles,
      permissions: resolved.permissions,
    };

    return handler(authReq, context);
  };
}

/**
 * Get auth context from request (for use in handlers)
 */
export function getAuth(request: AuthenticatedRequest): UserAuthContext | undefined {
  return request.auth;
}
