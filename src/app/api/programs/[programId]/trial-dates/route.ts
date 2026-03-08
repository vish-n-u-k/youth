/**
 * @purpose Public endpoint to list upcoming trial-eligible dates for a program
 * @inputs  GET: programId (path)
 * @outputs { programId, programName, dates: [{ dateId, date, spotsRemaining }] }
 * @errors  404, 429, 500
 */
import { createHandler, rateLimit } from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';

export const GET = createHandler({
  middleware: [rateLimit('public_read')],
  handler: async (_req, ctx) => {
    const programId = ctx.params?.programId as string;

    const program = await db.program.findUnique({
      where: { id: programId, status: 'ACTIVE' },
    });
    if (!program) throw AppError.notFound('Program');

    const now = new Date();

    const dates = await db.calendarDate.findMany({
      where: {
        programId,
        trialEligible: true,
        date: { gte: now },
      },
      include: {
        _count: { select: { trials: { where: { status: { not: 'CANCELLED' } } } } },
      },
      orderBy: { date: 'asc' },
    });

    return successResponse({
      programId: program.id,
      programName: program.name,
      dates: dates.map((d) => ({
        dateId: d.id,
        date: d.date.toISOString(),
        spotsRemaining: d.capacity - (d._count?.trials ?? 0),
      })),
    });
  },
});
