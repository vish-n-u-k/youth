import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth, type AuthenticatedRequest } from '@/server/auth';
import { db } from '@/server/db';

const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

// GET /api/roles - List roles for current org
async function getRoles(request: AuthenticatedRequest): Promise<NextResponse> {
  const auth = request.auth;

  const roles = await db.role.findMany({
    where: {
      OR: [
        { organizationId: null }, // Global roles
        ...(auth?.organizationId ? [{ organizationId: auth.organizationId }] : []),
      ],
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    success: true,
    data: { roles },
  });
}

// POST /api/roles - Create new role
async function createRole(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const auth = request.auth;
    const body: unknown = await request.json();
    const data = createRoleSchema.parse(body);

    const role = await db.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        organizationId: auth?.organizationId ?? null,
        isSystem: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { role },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

export const GET = withAuth(getRoles);
export const POST = withAuth(createRole);
