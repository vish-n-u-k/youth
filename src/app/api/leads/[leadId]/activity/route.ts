/**
 * @purpose List lead activity timeline (admin)
 * @inputs  leadId (path)
 * @outputs { activities[] }
 * @sideEffects None (read-only)
 * @errors  401, 404, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async (_req, ctx) => {
    const leadId = ctx.params?.leadId as string;

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw AppError.notFound('Lead');

    const activities = await db.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({
      activities: activities.map((a) => ({
        activityId: a.id,
        type: a.type.toLowerCase(),
        description: a.description,
        timestamp: a.createdAt.toISOString(),
        metadata: a.metadata ?? null,
      })),
    });
  },
});
