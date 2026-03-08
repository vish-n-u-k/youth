/**
 * @purpose Upcoming trials for dashboard (admin)
 * @inputs  None
 * @outputs { trials: [{ trialId, parentName, childName, programName, trialDate, status }] }
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trials = await db.trial.findMany({
      where: {
        status: 'SCHEDULED',
        trialDate: {
          date: { gte: today },
        },
      },
      orderBy: {
        trialDate: { date: 'asc' },
      },
      take: 10,
      include: {
        program: { select: { name: true } },
        trialDate: { select: { date: true } },
      },
    });

    return successResponse({
      trials: trials.map((t) => ({
        trialId: t.id,
        parentName: t.parentName,
        childName: t.childName,
        programName: t.program.name,
        trialDate: t.trialDate.date.toISOString(),
        status: t.status.toLowerCase(),
      })),
    });
  },
});
