import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hashPassword, createSessionToken } from '@/server/auth';
import { db } from '@/server/db';
import { validatePassword, getPasswordRequirements, auditLog } from '@/server/security';

import type { NextRequest } from 'next/server';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  name: z.string().min(1, 'Name is required').optional(),
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
    const body: unknown = await request.json();
    const data = registerSchema.parse(body);

    // Validate password against security rules
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: 'Password does not meet requirements',
          details: passwordValidation.errors,
          requirements: getPasswordRequirements(),
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await db.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Assign default role if exists
    const defaultRole = await db.role.findFirst({
      where: {
        name: 'User',
        organizationId: null,
      },
    });

    if (defaultRole) {
      await db.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
        },
      });
    }

    // Log registration
    await auditLog({
      event: 'REGISTER',
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
    });

    // Create session token
    const token = await createSessionToken(user.id, user.email);

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      data: { user, token },
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

    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
