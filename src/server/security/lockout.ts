// ============================================
// ACCOUNT LOCKOUT
// ============================================
// Locks accounts after too many failed login attempts.

import { security } from '@/config/security';
import { db } from '@/server/db';

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
  remainingAttempts: number;
}

/**
 * Check if an account is locked
 */
export async function checkLockout(email: string): Promise<LockoutStatus> {
  if (!security.lockout.enabled) {
    return {
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: Infinity,
    };
  }

  const user = await db.user.findUnique({
    where: { email },
    select: {
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    // Don't reveal if user exists
    return {
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: security.lockout.maxFailedAttempts,
    };
  }

  const now = new Date();

  // Check if lock has expired
  if (user.lockedUntil && user.lockedUntil > now) {
    return {
      isLocked: true,
      lockedUntil: user.lockedUntil,
      failedAttempts: user.failedLoginAttempts,
      remainingAttempts: 0,
    };
  }

  // If lock expired, it will be cleared on next login attempt
  const failedAttempts = user.lockedUntil ? 0 : user.failedLoginAttempts;
  const remainingAttempts = Math.max(0, security.lockout.maxFailedAttempts - failedAttempts);

  return {
    isLocked: false,
    lockedUntil: null,
    failedAttempts,
    remainingAttempts,
  };
}

/**
 * Record a failed login attempt
 * Returns the new lockout status
 */
export async function recordFailedAttempt(email: string): Promise<LockoutStatus> {
  if (!security.lockout.enabled) {
    return {
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: Infinity,
    };
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, failedLoginAttempts: true, lockedUntil: true },
  });

  if (!user) {
    // Don't reveal if user exists
    return {
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      remainingAttempts: security.lockout.maxFailedAttempts,
    };
  }

  const now = new Date();

  // Reset counter if lock expired
  const currentAttempts = user.lockedUntil && user.lockedUntil <= now ? 0 : user.failedLoginAttempts;
  const newAttempts = currentAttempts + 1;

  // Check if should lock
  const shouldLock = newAttempts >= security.lockout.maxFailedAttempts;
  const lockedUntil = shouldLock
    ? new Date(now.getTime() + security.lockout.lockoutDurationMs)
    : null;

  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: newAttempts,
      lockedUntil,
    },
  });

  return {
    isLocked: shouldLock,
    lockedUntil,
    failedAttempts: newAttempts,
    remainingAttempts: Math.max(0, security.lockout.maxFailedAttempts - newAttempts),
  };
}

/**
 * Clear failed attempts on successful login
 */
export async function clearFailedAttempts(userId: string): Promise<void> {
  if (!security.lockout.enabled) {
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Manually unlock an account (admin action)
 */
export async function unlockAccount(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}
