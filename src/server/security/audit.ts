// ============================================
// AUDIT LOGGING
// ============================================
// Track security-relevant events for compliance and forensics.

import { security, type AuditEvent } from '@/config/security';
import { db } from '@/server/db';

import type { Prisma } from '@prisma/client';

export interface AuditLogEntry {
  event: AuditEvent;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Log a security event
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  if (!security.audit.enabled) {
    return;
  }

  // Check if this event type should be logged
  if (!security.audit.events.includes(entry.event)) {
    return;
  }

  const logEntry = {
    event: entry.event,
    userId: entry.userId ?? null,
    email: entry.email ?? null,
    ipAddress: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
    metadata: entry.metadata ?? {},
    createdAt: new Date(),
  };

  if (security.audit.storage === 'console') {
    // Console logging (development/debugging)
    console.warn('[AUDIT]', JSON.stringify(logEntry, null, 2));
    return;
  }

  // Database logging
  try {
    await db.auditLog.create({
      data: {
        event: logEntry.event,
        userId: logEntry.userId,
        email: logEntry.email,
        ipAddress: logEntry.ipAddress,
        userAgent: logEntry.userAgent,
        metadata: logEntry.metadata,
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('[AUDIT] Failed to write audit log:', error);
  }
}

/**
 * Query audit logs (for admin dashboard)
 */
export async function getAuditLogs(options: {
  userId?: string;
  email?: string;
  event?: AuditEvent;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: Array<Record<string, unknown>>; total: number }> {
  if (security.audit.storage !== 'database') {
    return { logs: [], total: 0 };
  }

  const where: Record<string, unknown> = {};

  if (options.userId) {
    where.userId = options.userId;
  }
  if (options.email) {
    where.email = options.email;
  }
  if (options.event) {
    where.event = options.event;
  }
  if (options.startDate !== undefined || options.endDate !== undefined) {
    where.createdAt = {};
    if (options.startDate) {
      (where.createdAt as Record<string, Date>).gte = options.startDate;
    }
    if (options.endDate) {
      (where.createdAt as Record<string, Date>).lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Clean up old audit logs (run as cron job)
 */
export async function cleanupAuditLogs(): Promise<number> {
  const retentionDays = security.audit.retentionDays as number;
  if (security.audit.storage !== 'database' || retentionDays === 0) {
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  return result.count;
}
