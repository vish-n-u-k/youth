/**
 * @purpose Recent 10 leads for dashboard (admin)
 * @inputs  None
 * @outputs { leads: [{ leadId, parentName, email, source, status, createdAt }] }
 * @sideEffects None (read-only)
 * @errors  401, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { db } from '@/server/db/client';

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async () => {
    const leads = await db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return successResponse({
      leads: leads.map((l) => ({
        leadId: l.id,
        parentName: l.parentName,
        email: l.email,
        source: l.source.toLowerCase(),
        status: l.status.toLowerCase(),
        createdAt: l.createdAt.toISOString(),
      })),
    });
  },
});
