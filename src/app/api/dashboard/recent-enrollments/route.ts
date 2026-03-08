/**
 * @purpose Recent 10 enrollments for dashboard (admin)
 * @inputs  None
 * @outputs { enrollments: [{ enrollmentId, parentName, childName, programName, enrolledAt, paymentStatus }] }
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
    const enrollments = await db.enrollment.findMany({
      orderBy: { enrolledAt: 'desc' },
      take: 10,
      include: {
        program: { select: { name: true } },
        payment: { select: { status: true } },
      },
    });

    return successResponse({
      enrollments: enrollments.map((e) => ({
        enrollmentId: e.id,
        parentName: e.parentName,
        childName: e.childName,
        programName: e.program.name,
        enrolledAt: e.enrolledAt.toISOString(),
        paymentStatus: (e.payment?.status ?? 'PENDING').toLowerCase(),
      })),
    });
  },
});
