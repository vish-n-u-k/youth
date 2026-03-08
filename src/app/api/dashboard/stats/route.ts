/**
 * @purpose Dashboard summary stats (admin)
 * @inputs  None
 * @outputs { totalLeadsThisMonth, activeEnrollments, totalRevenue, pendingPayments }
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLeadsThisMonth, activeEnrollments, revenueResult, pendingPayments] =
      await Promise.all([
        db.lead.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        db.enrollment.count({
          where: { status: 'ACTIVE' },
        }),
        db.payment.aggregate({
          where: { status: { in: ['PAID', 'PARTIAL'] } },
          _sum: { amountReceived: true },
        }),
        db.payment.count({
          where: { status: 'PENDING' },
        }),
      ]);

    return successResponse({
      totalLeadsThisMonth,
      activeEnrollments,
      totalRevenue: revenueResult._sum.amountReceived ?? 0,
      pendingPayments,
    });
  },
});
