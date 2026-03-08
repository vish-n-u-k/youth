/**
 * @purpose List all coupons / Create a coupon (admin)
 * @inputs  GET: none | POST: CouponRequest
 * @outputs GET: CouponListResponse | POST: CouponResponse (201)
 * @sideEffects POST: Coupon CREATE
 * @errors  401, 400, 409, 500
 */
import {
  createHandler, authSession, requireRole,
  validateBody, getParsedBody,
} from '@/server/middleware';
import { successResponse, createdResponse } from '@/server/lib/apiResponse';
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

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async () => {
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return successResponse({ coupons: coupons.map(formatCoupon) });
  },
});

export const POST = createHandler({
  middleware: [authSession, requireRole('admin'), validateBody(CouponRequestSchema)],
  handler: async (req) => {
    const body = getParsedBody<CouponRequest>(req);

    const existing = await db.coupon.findUnique({ where: { code: body.code } });
    if (existing) throw AppError.conflict('Coupon code already exists');

    const coupon = await db.coupon.create({
      data: {
        code: body.code,
        discountType: body.discountType.toUpperCase() as DiscountType,
        discountValue: body.discountValue,
        scope: body.scope.toUpperCase() as CouponScope,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        usageLimit: body.usageLimit ?? null,
      },
    });

    return createdResponse(formatCoupon(coupon));
  },
});
