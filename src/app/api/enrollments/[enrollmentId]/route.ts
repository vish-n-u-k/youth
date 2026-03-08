/**
 * @purpose Get full enrollment details (admin)
 * @inputs  enrollmentId (path)
 * @outputs AdminEnrollmentDetailResponse
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
    const enrollmentId = ctx.params?.enrollmentId as string;

    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        program: { select: { name: true, location: true } },
        payment: { select: { status: true, amountReceived: true } },
      },
    });
    if (!enrollment) throw AppError.notFound('Enrollment not found');

    const breakdown = (enrollment.priceBreakdown as Array<{ label: string; amount: number }>) ?? [];

    return successResponse({
      enrollmentId: enrollment.id,
      parentName: enrollment.parentName,
      parentEmail: enrollment.parentEmail,
      parentPhone: enrollment.parentPhone ?? '',
      childName: enrollment.childName,
      childAge: enrollment.childAge ?? 0,
      programId: enrollment.programId,
      programName: enrollment.program.name,
      programSchedule: '',
      location: enrollment.program.location ?? '',
      status: enrollment.status.toLowerCase(),
      paymentStatus: (enrollment.payment?.status ?? 'PENDING').toLowerCase(),
      totalDue: enrollment.totalDue,
      amountReceived: enrollment.payment?.amountReceived ?? 0,
      remainingBalance: enrollment.totalDue - (enrollment.payment?.amountReceived ?? 0),
      priceBreakdown: breakdown,
      couponApplied: enrollment.couponCode ?? null,
      leadId: enrollment.leadId ?? null,
      trialId: enrollment.trialId ?? null,
      cancellationReason: enrollment.cancellationReason ?? null,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      updatedAt: enrollment.updatedAt.toISOString(),
    });
  },
});
