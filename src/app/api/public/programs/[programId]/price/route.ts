/**
 * @purpose Calculate price breakdown with optional coupon
 * @inputs  programId (path) + PriceBreakdownRequest { couponCode? }
 * @outputs PriceBreakdownResponse
 * @sideEffects None (read-only)
 * @errors  400 (invalid coupon), 404 (program not found), 500
 */
import { createHandler, rateLimit, validateBody, getParsedBody } from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { PriceBreakdownRequestSchema, type PriceBreakdownRequest } from '@/schemas/enrollment.schema';

export const POST = createHandler({
  middleware: [rateLimit('coupon_check'), validateBody(PriceBreakdownRequestSchema)],
  handler: async (req, ctx) => {
    const programId = ctx.params?.programId as string;
    const body = getParsedBody<PriceBreakdownRequest>(req);

    const program = await db.program.findUnique({
      where: { id: programId, status: 'ACTIVE' },
    });
    if (!program) throw AppError.notFound('Program not found');

    let programFee = program.baseFee;
    const registrationFee = program.registrationFee ?? 0;
    let couponDiscount = 0;
    let couponAppliedTo: string | null = null;

    const breakdown: Array<{ label: string; amount: number }> = [
      { label: 'Program Fee', amount: programFee },
    ];
    if (registrationFee > 0 && program.registrationFeeRequired) {
      breakdown.push({ label: 'Registration Fee', amount: registrationFee });
    }

    if (body.couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: body.couponCode },
      });
      if (!coupon) throw AppError.badRequest('Invalid coupon code');
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw AppError.badRequest('Coupon has expired');
      }
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw AppError.badRequest('Coupon usage limit reached');
      }

      const discount =
        coupon.discountType === 'PERCENTAGE'
          ? (programFee * coupon.discountValue) / 100
          : coupon.discountValue;

      if (coupon.scope === 'PROGRAM_FEE' || coupon.scope === 'BOTH') {
        couponDiscount = Math.min(discount, programFee);
        couponAppliedTo = coupon.scope === 'BOTH' ? 'both' : 'program_fee';
      } else if (coupon.scope === 'REGISTRATION_FEE') {
        couponDiscount = Math.min(discount, registrationFee);
        couponAppliedTo = 'registration_fee';
      }

      if (couponDiscount > 0) {
        breakdown.push({ label: `Coupon (${body.couponCode})`, amount: -couponDiscount });
      }
    }

    const totalDue = programFee + (program.registrationFeeRequired ? registrationFee : 0) - couponDiscount;

    return successResponse({
      programFee,
      registrationFee: program.registrationFeeRequired ? registrationFee : null,
      couponDiscount,
      couponAppliedTo,
      totalDue: Math.max(0, totalDue),
      breakdown,
    });
  },
});
