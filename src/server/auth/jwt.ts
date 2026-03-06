// ============================================
// JWT UTILITIES
// ============================================

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

import { env } from '@/config/env';

// Encode secret for jose library (validated by env module)
const getJwtSecret = (): Uint8Array => new TextEncoder().encode(env.jwtSecret);

const JWT_ISSUER = 'nextjs-starter';
const JWT_AUDIENCE = 'nextjs-starter-app';

export interface SessionTokenPayload extends JWTPayload {
  sub: string; // user id
  email: string;
}

export interface PermissionTokenPayload extends JWTPayload {
  sub: string; // user id
  org?: string; // organization id
  roles: string[];
  permissions: string[];
}

/**
 * Create a session JWT token
 */
export async function createSessionToken(
  userId: string,
  email: string,
  expiresIn: string = '7d'
): Promise<string> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());

  return token;
}

/**
 * Verify and decode a session token
 */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as SessionTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Create a permission JWT token (for frontend caching)
 */
export async function createPermissionToken(
  userId: string,
  roles: string[],
  permissions: string[],
  organizationId?: string
): Promise<string> {
  const token = await new SignJWT({
    roles,
    permissions,
    ...(organizationId && { org: organizationId }),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('24h')
    .sign(getJwtSecret());

  return token;
}

/**
 * Verify and decode a permission token
 */
export async function verifyPermissionToken(
  token: string
): Promise<PermissionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as PermissionTokenPayload;
  } catch {
    return null;
  }
}
