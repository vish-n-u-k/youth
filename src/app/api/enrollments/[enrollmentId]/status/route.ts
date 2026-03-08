/**
 * @purpose Cancel or complete an enrollment (admin)
 * @inputs  enrollmentId (path) + UpdateEnrollmentStatusRequest { status, cancellationReason? }
 * @outputs AdminEnrollmentDetailResponse
 * @sideEffects Enrollment UPDATE, AuditLog CREATE
 * @errors  401, 400 (invalid transition), 404, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
  validateBody,
  getParsedBody,
  auditAction,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { UpdateEnrollmentStatusRequestSchema, type UpdateEnrollmentStatusRequest } from '@/schemas/enrollment.schema';
import type { EnrollmentStatus } from '@prisma/client';

export const PATCH = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(UpdateEnrollmentStatusRequestSchema),
    auditAction({ action: 'enrollment_status_change', resourceType: 'Enrollment' }),
  ],
  handler: async (req, ctx) => {
    const enrollmentId = ctx.params?.enrollmentId as string;
    const body = getParsedBody<UpdateEnrollmentStatusRequest>(req);

    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        program: { select: { name: true, location: true } },
        payment: { select: { status: true, amountReceived: true } },
      },
    });
    if (!enrollment) throw AppError.notFound('Enrollment not found');

    // Validate status transition: only ACTIVE can move to CANCELLED or COMPLETED
    if (enrollment.status !== 'ACTIVE') {
      throw AppError.badRequest(`Cannot change status from ${enrollment.status.toLowerCase()} to ${body.status}`);
    }

    const newStatus = body.status.toUpperCase() as EnrollmentStatus;

    const updated = await db.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: newStatus,
        cancellationReason: body.status === 'cancelled' ? body.cancellationReason : undefined,
      },
      include: {
        program: { select: { name: true, location: true } },
        payment: { select: { status: true, amountReceived: true } },
      },
    });

    const breakdown = (updated.priceBreakdown as Array<{ label: string; amount: number }>) ?? [];

    return successResponse({
      enrollmentId: updated.id,
      parentName: updated.parentName,
      parentEmail: updated.parentEmail,
      parentPhone: updated.parentPhone ?? '',
      childName: updated.childName,
      childAge: updated.childAge ?? 0,
      programId: updated.programId,
      programName: updated.program.name,
      programSchedule: '',
      location: updated.program.location ?? '',
      status: updated.status.toLowerCase(),
      paymentStatus: (updated.payment?.status ?? 'PENDING').toLowerCase(),
      totalDue: updated.totalDue,
      amountReceived: updated.payment?.amountReceived ?? 0,
      remainingBalance: updated.totalDue - (updated.payment?.amountReceived ?? 0),
      priceBreakdown: breakdown,
      couponApplied: updated.couponCode ?? null,
      leadId: updated.leadId ?? null,
      trialId: updated.trialId ?? null,
      cancellationReason: updated.cancellationReason ?? null,
      enrolledAt: updated.enrolledAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  },
});
