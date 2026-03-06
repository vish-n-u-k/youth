import { NextResponse } from 'next/server';

import { resolveUserPermissions } from '@/lib/permissions/resolver';
import { withAuth, createPermissionToken, type AuthenticatedRequest } from '@/server/auth';

async function handler(request: AuthenticatedRequest): Promise<NextResponse> {
  const auth = request.auth;

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Resolve all permissions
  const resolved = await resolveUserPermissions(auth.userId, auth.organizationId);

  // Generate permission JWT
  const token = await createPermissionToken(
    auth.userId,
    resolved.roles,
    resolved.permissions,
    auth.organizationId
  );

  return NextResponse.json({
    success: true,
    data: {
      token,
      roles: resolved.roles,
      permissions: resolved.permissions,
    },
  });
}

export const GET = withAuth(handler);
