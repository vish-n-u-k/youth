/**
 * @purpose Cross-cutting audit trail for security and state-change events
 * @inputs  architect_output/global_services_registry.json (auditLogService)
 *          architect_output/global_security_policies.json (auditLogging)
 * @outputs AuditLog records in DB
 * @sideEffects AuditLog CREATE (append-only, no update/delete)
 * @errors  Failures are logged but never thrown — audit must not break request flow
 * @idempotency Append-only; duplicate calls create duplicate entries (acceptable)
 */
import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';

export type AuditEventPayload = {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

/**
 * @purpose Record a business state-change event
 * @inputs  AuditEventPayload
 * @outputs void
 * @sideEffects AuditLog CREATE in DB (async, non-blocking)
 * @errors  Swallowed — logged to stderr
 */
export async function logEvent(payload: AuditEventPayload): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: payload.userId ?? null,
        action: payload.action,
        resourceType: payload.resourceType ?? null,
        resourceId: payload.resourceId ?? null,
        outcome: payload.outcome ?? null,
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
        metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit event:', payload.action, err);
  }
}

/**
 * @purpose Record a security-sensitive event (login, logout, password reset)
 * @inputs  AuditEventPayload (same shape, higher severity context)
 * @outputs void
 * @sideEffects AuditLog CREATE
 * @errors  Swallowed — logged to stderr
 */
export async function logSecurityEvent(payload: AuditEventPayload): Promise<void> {
  return logEvent({ ...payload, metadata: { ...payload.metadata, severity: 'security' } });
}

export function extractClientInfo(req: Request): { ipAddress: string; userAgent: string } {
  const forwarded = req.headers.get('x-forwarded-for');
  const ipAddress = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  return { ipAddress, userAgent };
}
