/**
 * @purpose List active programs for parent discovery (no auth)
 * @inputs  None
 * @outputs PublicProgramListResponse { programs[] }
 * @sideEffects None (read-only)
 * @policy  GP-06: Parent-facing pages are publicly accessible without login
 * @errors  500
 */
import { createHandler } from '@/server/middleware';
import { rateLimit } from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { db } from '@/server/db/client';

export const GET = createHandler({
  middleware: [rateLimit('public_read')],
  handler: async () => {
    const programs = await db.program.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'asc' },
      include: {
        _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } },
      },
    });

    return successResponse({
      programs: programs.map((p) => ({
        programId: p.id,
        name: p.name,
        ageGroupMin: p.ageGroupMin ?? 0,
        ageGroupMax: p.ageGroupMax ?? 18,
        schedule: '',
        totalFee: p.baseFee,
        trialAvailable: p.trialAvailable,
        isFull: p._count.enrollments >= p.capacity,
        enrollmentOpen: true,
      })),
    });
  },
});
