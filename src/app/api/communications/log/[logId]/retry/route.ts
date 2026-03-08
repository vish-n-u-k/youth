/**
 * @purpose Retry sending a failed email
 * @inputs  logId (path)
 * @outputs RetryEmailResponse { logId, message, retryQueued }
 * @sideEffects CommunicationLog UPDATE (status back to PENDING), AuditLog CREATE
 * @errors  401, 404, 409 (already sent/pending), 500
 */
import {
  createHandler,
  authSession,
  requireRole,
  auditAction,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';

export const POST = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    auditAction({ action: 'email_retry', resourceType: 'CommunicationLog' }),
  ],
  handler: async (_req, ctx) => {
    const logId = ctx.params?.logId as string;

    const logEntry = await db.communicationLog.findUnique({ where: { id: logId } });
    if (!logEntry) throw AppError.notFound('Communication log entry not found');

    if (logEntry.deliveryStatus !== 'FAILED') {
      throw AppError.conflict(
        logEntry.deliveryStatus === 'SENT'
          ? 'Email was already sent successfully'
          : 'Email is already queued for delivery'
      );
    }

    await db.communicationLog.update({
      where: { id: logId },
      data: {
        deliveryStatus: 'PENDING',
        failureReason: null,
      },
    });

    return successResponse({
      logId,
      message: 'Email retry has been queued',
      retryQueued: true,
    });
  },
});
