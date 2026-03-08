/**
 * @purpose List all enrollments with filters, search, pagination (admin)
 * @inputs  AdminEnrollmentListQuery { status?, programId?, paymentStatus?, search?, page, limit }
 * @outputs AdminEnrollmentListResponse { enrollments[], total, page, limit }
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
import { AdminEnrollmentListQuerySchema, type AdminEnrollmentListQuery } from '@/schemas/enrollment.schema';
import type { Prisma, EnrollmentStatus, PaymentStatus } from '@prisma/client';

export const GET = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateQuery(AdminEnrollmentListQuerySchema),
  ],
  handler: async (req) => {
    const query = getParsedQuery<AdminEnrollmentListQuery>(req);

    const enrollmentWhere: Prisma.EnrollmentWhereInput = {};
    if (query.status) {
      enrollmentWhere.status = query.status.toUpperCase() as EnrollmentStatus;
    }
    if (query.programId) {
      enrollmentWhere.programId = query.programId;
    }
    if (query.search) {
      enrollmentWhere.OR = [
        { parentName: { contains: query.search, mode: 'insensitive' } },
        { childName: { contains: query.search, mode: 'insensitive' } },
        { parentEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Payment status filter requires join
    const paymentWhere: Prisma.PaymentWhereInput | undefined = query.paymentStatus
      ? { status: query.paymentStatus.toUpperCase() as PaymentStatus }
      : undefined;

    if (paymentWhere) {
      enrollmentWhere.payment = paymentWhere;
    }

    const [enrollments, total] = await Promise.all([
      db.enrollment.findMany({
        where: enrollmentWhere,
        include: {
          program: { select: { name: true } },
          payment: { select: { status: true, amountReceived: true } },
        },
        orderBy: { enrolledAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.enrollment.count({ where: enrollmentWhere }),
    ]);

    return successResponse({
      enrollments: enrollments.map((e) => ({
        enrollmentId: e.id,
        parentName: e.parentName,
        parentEmail: e.parentEmail,
        childName: e.childName,
        childAge: e.childAge ?? 0,
        programId: e.programId,
        programName: e.program.name,
        status: e.status.toLowerCase(),
        paymentStatus: (e.payment?.status ?? 'PENDING').toLowerCase(),
        totalDue: e.totalDue,
        amountReceived: e.payment?.amountReceived ?? 0,
        enrolledAt: e.enrolledAt.toISOString(),
      })),
      total,
      page: query.page,
      limit: query.limit,
    });
  },
});
