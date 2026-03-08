/**
 * @purpose Get public program details for trial booking or enrollment form
 * @inputs  programId (path)
 * @outputs PublicProgramResponse
 * @sideEffects None (read-only)
 * @errors  404, 500
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
      include: {
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
      },
    });
    if (!program) throw AppError.notFound('Program not found or not active');

    return successResponse({
      programId: program.id,
      name: program.name,
      ageGroupMin: program.ageGroupMin ?? 0,
      ageGroupMax: program.ageGroupMax ?? 18,
      totalSessions: program.totalSessions,
      sessionDuration: program.sessionDuration ?? 0,
      location: program.location ?? '',
      startDate: program.startDate?.toISOString() ?? '',
      endDate: program.endDate?.toISOString() ?? '',
      totalFee: program.baseFee,
      registrationFee: program.registrationFee ?? null,
      registrationFeeRequired: program.registrationFeeRequired,
      trialAvailable: program.trialAvailable,
      isFull: program._count.enrollments >= program.capacity,
      enrollmentOpen: true,
    });
  },
});
