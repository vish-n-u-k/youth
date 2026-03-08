/**
 * @purpose View sent/failed/pending email log with filters and pagination
 * @inputs  CommunicationsLogQuery { deliveryStatus?, triggerEvent?, search?, page, limit }
 * @outputs CommunicationsLogResponse { communications[], total, page, limit }
 * @sideEffects None (read-only)
 * @errors  401, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
  validateQuery,
  getParsedQuery,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { db } from '@/server/db/client';
import { CommunicationsLogQuerySchema, type CommunicationsLogQuery } from '@/schemas/communication.schema';
import type { Prisma, DeliveryStatus, TriggerEvent } from '@prisma/client';

export const GET = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateQuery(CommunicationsLogQuerySchema),
  ],
  handler: async (req) => {
    const query = getParsedQuery<CommunicationsLogQuery>(req);

    const where: Prisma.CommunicationLogWhereInput = {};

    if (query.deliveryStatus) {
      where.deliveryStatus = query.deliveryStatus.toUpperCase() as DeliveryStatus;
    }
    if (query.triggerEvent) {
      where.triggerEvent = query.triggerEvent.toUpperCase() as TriggerEvent;
    }
    if (query.search) {
      where.OR = [
        { recipientEmail: { contains: query.search, mode: 'insensitive' } },
        { recipientName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [communications, total] = await Promise.all([
      db.communicationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.communicationLog.count({ where }),
    ]);

    return successResponse({
      communications: communications.map((c) => ({
        logId: c.id,
        recipientEmail: c.recipientEmail,
        recipientName: c.recipientName ?? '',
        subject: c.subject,
        templateName: '',
        triggerEvent: c.triggerEvent?.toLowerCase() ?? '',
        deliveryStatus: c.deliveryStatus.toLowerCase() as 'sent' | 'failed' | 'pending',
        sentAt: c.sentAt?.toISOString() ?? null,
        failureReason: c.failureReason ?? null,
      })),
      total,
      page: query.page,
      limit: query.limit,
    });
  },
});
