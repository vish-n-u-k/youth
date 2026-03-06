import { NextResponse } from 'next/server';

import { withAuth, type AuthenticatedRequest } from '@/server/auth';
import { db } from '@/server/db';

async function handler(request: AuthenticatedRequest): Promise<NextResponse> {
  const auth = request.auth;

  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get full user details
  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        select: {
          isOwner: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      user,
      auth: {
        roles: auth.roles,
        permissions: auth.permissions,
        organizationId: auth.organizationId,
      },
    },
  });
}

export const GET = withAuth(handler);
