/**
 * @purpose Update / Delete a coupon (admin)
 * @inputs  PUT: couponId (path) + CouponRequest | DELETE: couponId (path)
 * @outputs PUT: CouponResponse | DELETE: DeleteResponse
 * @sideEffects Coupon UPDATE or DELETE
 * @errors  401, 404, 400, 500
 */
import {
  createHandler, authSession, requireRole,
  validateBody, getParsedBody,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { CouponRequestSchema, type CouponRequest } from '@/schemas/program.schema';
import type { DiscountType, CouponScope } from '@prisma/client';

function formatCoupon(c: any) {
  return {
    couponId: c.id,
    code: c.code,
    discountType: c.discountType.toLowerCase(),
    discountValue: c.discountValue,
    scope: c.scope.toLowerCase(),
    expiresAt: c.expiresAt?.toISOString() ?? null,
    usageLimit: c.usageLimit ?? null,
    usageCount: c.usageCount,
    createdAt: c.createdAt.toISOString(),
  };
}

export const PUT = createHandler({
  middleware: [authSession, requireRole('admin'), validateBody(CouponRequestSchema)],
  handler: async (req, ctx) => {
    const couponId = ctx.params?.couponId as string;
    const body = getParsedBody<CouponRequest>(req);

    const existing = await db.coupon.findUnique({ where: { id: couponId } });
    if (!existing) throw AppError.notFound('Coupon not found');

    const coupon = await db.coupon.update({
      where: { id: couponId },
      data: {
        code: body.code,
        discountType: body.discountType.toUpperCase() as DiscountType,
        discountValue: body.discountValue,
        scope: body.scope.toUpperCase() as CouponScope,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        usageLimit: body.usageLimit ?? null,
      },
    });

    return successResponse(formatCoupon(coupon));
  },
});

export const DELETE = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async (_req, ctx) => {
    const couponId = ctx.params?.couponId as string;

    const existing = await db.coupon.findUnique({ where: { id: couponId } });
    if (!existing) throw AppError.notFound('Coupon not found');

    await db.coupon.delete({ where: { id: couponId } });

    return successResponse({ message: 'Coupon deleted successfully', deleted: true });
  },
});
