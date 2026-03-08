/**
 * @purpose Get payment detail and update payment (admin)
 * @inputs  paymentId (path), UpdatePaymentRequest (PUT body)
 * @outputs Payment detail object
 * @sideEffects Payment UPDATE (PUT), AuditLog CREATE (PUT)
 * @errors  401, 404, 500
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
import { UpdatePaymentRequestSchema, type UpdatePaymentRequest } from '@/schemas/payment.schema';
import type { PaymentStatus } from '@prisma/client';

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async (_req, ctx) => {
    const paymentId = ctx.params?.paymentId as string;

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        enrollment: {
          select: {
            parentName: true,
            parentEmail: true,
            childName: true,
            program: { select: { name: true } },
          },
        },
      },
    });
    if (!payment) throw AppError.notFound('Payment');

    return successResponse({
      paymentId: payment.id,
      enrollmentId: payment.enrollmentId,
      parentName: payment.enrollment.parentName,
      parentEmail: payment.enrollment.parentEmail,
      childName: payment.enrollment.childName,
      programName: payment.enrollment.program.name,
      status: payment.status.toLowerCase(),
      amountDue: payment.amountDue,
      amountReceived: payment.amountReceived,
      remainingBalance: payment.amountDue - payment.amountReceived,
      paymentMethod: payment.paymentMethod ?? null,
      notes: payment.notes ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    });
  },
});

export const PUT = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(UpdatePaymentRequestSchema),
    auditAction({ action: 'payment_update', resourceType: 'Payment' }),
  ],
  handler: async (req, ctx) => {
    const paymentId = ctx.params?.paymentId as string;
    const body = getParsedBody<UpdatePaymentRequest>(req);

    const existing = await db.payment.findUnique({ where: { id: paymentId } });
    if (!existing) throw AppError.notFound('Payment');

    const updated = await db.payment.update({
      where: { id: paymentId },
      data: {
        status: body.status.toUpperCase() as PaymentStatus,
        amountReceived: body.amountReceived,
        paymentMethod: body.paymentMethod,
        notes: body.notes,
      },
      include: {
        enrollment: {
          select: {
            parentName: true,
            parentEmail: true,
            childName: true,
            program: { select: { name: true } },
          },
        },
      },
    });

    return successResponse({
      paymentId: updated.id,
      enrollmentId: updated.enrollmentId,
      parentName: updated.enrollment.parentName,
      parentEmail: updated.enrollment.parentEmail,
      childName: updated.enrollment.childName,
      programName: updated.enrollment.program.name,
      status: updated.status.toLowerCase(),
      amountDue: updated.amountDue,
      amountReceived: updated.amountReceived,
      remainingBalance: updated.amountDue - updated.amountReceived,
      paymentMethod: updated.paymentMethod ?? null,
      notes: updated.notes ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  },
});
