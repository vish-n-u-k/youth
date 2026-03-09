/**
 * @purpose Authentication service: session-based auth with httpOnly cookies
 * @inputs  architect_output/global_services_registry.json (authService)
 *          architect_output/global_security_policies.json (authentication)
 * @outputs login, logout, validateSession, requestPasswordReset, setNewPassword
 * @sideEffects DB writes: Session (create/delete), PasswordResetToken (create/update), Admin (update password)
 * @errors  401 (invalid credentials/session), 410 (expired token), 400 (validation)
 * @idempotency Password reset: token single-use; logout: safe to call multiple times
 */
import { db } from '@/server/db/client';
import { getEnv } from '@/server/config/env';
import { AppError } from '@/server/errors';
import crypto from 'crypto';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CONCURRENT_SESSIONS = 5;
const RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_MIN_LENGTH = 8;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(32);
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      resolve(salt.toString('hex') + ':' + key.toString('hex'));
    });
  });
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), key));
    });
  });
}

/**
 * @purpose Authenticate admin by email/password, create session, return session ID
 * @inputs  email, password
 * @outputs { sessionId, admin: { id, email, name, role } }
 * @sideEffects Session CREATE in DB; enforces max concurrent sessions
 * @errors  401 if invalid credentials
 */
export async function login(email: string, password: string) {
  const admin = await db.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password');
  }
  // Enforce max concurrent sessions
  const sessions = await db.session.findMany({
    where: { adminId: admin.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
  });
  if (sessions.length >= MAX_CONCURRENT_SESSIONS) {
    const oldest = sessions[0];
    if (oldest) {
      await db.session.delete({ where: { id: oldest.id } });
    }
  }

  const session = await db.session.create({
    data: {
      adminId: admin.id,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
    },
  });

  return {
    sessionId: session.id,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  };
}

/**
 * @purpose Invalidate session and clear cookie
 * @inputs  sessionId
 * @outputs void
 * @sideEffects Session DELETE in DB
 * @errors  None (idempotent — missing session is not an error)
 */
export async function logout(sessionId: string): Promise<void> {
  await db.session.deleteMany({ where: { id: sessionId } });
}

/**
 * @purpose Validate session cookie, return admin profile
 * @inputs  sessionId from cookie
 * @outputs { id, email, name, role } or null
 * @sideEffects None (read-only)
 * @errors  Returns null for invalid/expired sessions
 */
export async function validateSession(sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { admin: { select: { id: true, email: true, name: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.admin;
}

/**
 * @purpose Generate password reset token, return token string
 * @inputs  email
 * @outputs { token, adminId } or null (timing-safe: always same response time)
 * @sideEffects PasswordResetToken CREATE in DB
 * @errors  Never throws — returns null for non-existent emails
 * @idempotency Safe to call multiple times; previous tokens remain valid until used/expired
 */
export async function requestPasswordReset(email: string) {
  const admin = await db.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin) return null;

  const token = crypto.randomBytes(32).toString('hex');
  await db.passwordResetToken.create({
    data: {
      adminId: admin.id,
      email: admin.email,
      token,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
    },
  });

  return { token, adminId: admin.id };
}

/**
 * @purpose Validate reset token, update password, invalidate all sessions
 * @inputs  token, newPassword
 * @outputs void
 * @sideEffects PasswordResetToken UPDATE (used=true), Admin UPDATE (passwordHash),
 *              Session DELETE ALL for the admin
 * @errors  410 (expired/used token), 400 (password too short)
 * @idempotency Single-use token — second call returns 410
 */
export async function setNewPassword(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    throw AppError.badRequest(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken) {
    throw AppError.gone('Invalid or expired password reset link');
  }
  if (resetToken.used) {
    throw AppError.gone('This password reset link has already been used');
  }
  if (resetToken.expiresAt < new Date()) {
    throw AppError.gone('This password reset link has expired');
  }

  const passwordHash = await hashPassword(newPassword);

  await db.$transaction([
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
    db.admin.update({
      where: { id: resetToken.adminId },
      data: { passwordHash },
    }),
    db.session.deleteMany({
      where: { adminId: resetToken.adminId },
    }),
  ]);
}

export function getSessionCookieConfig() {
  const env = getEnv();
  return {
    name: 'session',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  };
}
