/**
 * @purpose List all payments with filters, search, pagination (admin)
 * @inputs  PaymentListQuery { status?, search?, page, limit }
 * @outputs { payments[], total, page, limit }
 * @sideEffects None (read-only)
 * @errors  401, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
  validateQuery,
  getParsedQuery,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { db } from '@/server/db/client';
import { PaymentListQuerySchema, type PaymentListQuery } from '@/schemas/payment.schema';
import type { Prisma, PaymentStatus } from '@prisma/client';

export const GET = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateQuery(PaymentListQuerySchema),
  ],
  handler: async (req) => {
    const query = getParsedQuery<PaymentListQuery>(req);

    const paymentWhere: Prisma.PaymentWhereInput = {};

    if (query.status) {
      paymentWhere.status = query.status.toUpperCase() as PaymentStatus;
    }

    if (query.search) {
      paymentWhere.enrollment = {
        OR: [
          { parentName: { contains: query.search, mode: 'insensitive' } },
          { parentEmail: { contains: query.search, mode: 'insensitive' } },
          { childName: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where: paymentWhere,
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
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.payment.count({ where: paymentWhere }),
    ]);

    return successResponse({
      payments: payments.map((p) => ({
        paymentId: p.id,
        enrollmentId: p.enrollmentId,
        parentName: p.enrollment.parentName,
        parentEmail: p.enrollment.parentEmail,
        childName: p.enrollment.childName,
        programName: p.enrollment.program.name,
        status: p.status.toLowerCase(),
        amountDue: p.amountDue,
        amountReceived: p.amountReceived,
        remainingBalance: p.amountDue - p.amountReceived,
        paymentMethod: p.paymentMethod ?? null,
        notes: p.notes ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
      page: query.page,
      limit: query.limit,
    });
  },
});
