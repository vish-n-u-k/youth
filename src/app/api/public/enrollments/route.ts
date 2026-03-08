/**
 * @purpose Submit enrollment for a child in a program
 * @inputs  EnrollmentRequest { programId, parentName, email, phone, childName, childAge, couponCode? }
 * @outputs EnrollmentResponse (201)
 * @sideEffects Enrollment CREATE, Payment CREATE (HO-02), Lead auto-create/link (GP-02/GP-04),
 *              Coupon usage increment, email trigger (HO-03)
 * @policy  GP-01: one enrollment per child per program
 * @errors  400 (validation/coupon/capacity), 404, 409 (duplicate), 500
 */
import { createHandler, rateLimit, validateBody, getParsedBody } from '@/server/middleware';
import { createdResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { sendTriggeredEmail } from '@/server/services/emailService';
import { EnrollmentRequestSchema, type EnrollmentRequest } from '@/schemas/enrollment.schema';
import type { Prisma } from '@prisma/client';

export const POST = createHandler({
  middleware: [rateLimit('public_write'), validateBody(EnrollmentRequestSchema)],
  handler: async (req) => {
    const body = getParsedBody<EnrollmentRequest>(req);

    // Validate program exists and is active
    const program = await db.program.findUnique({
      where: { id: body.programId, status: 'ACTIVE' },
      include: { _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
    });
    if (!program) throw AppError.notFound('Program not found or not active');

    // Check capacity
    if (program._count.enrollments >= program.capacity) {
      throw AppError.badRequest('Program is at full capacity');
    }

    // GP-01: Duplicate enrollment check
    const existingEnrollment = await db.enrollment.findFirst({
      where: {
        programId: body.programId,
        parentEmail: body.email,
        childName: body.childName,
        status: 'ACTIVE',
      },
    });
    if (existingEnrollment) {
      throw AppError.conflict('This child is already enrolled in this program');
    }

    // Calculate price
    let programFee = program.baseFee;
    const registrationFee = program.registrationFeeRequired ? (program.registrationFee ?? 0) : 0;
    let couponDiscount = 0;
    const breakdown: Array<{ label: string; amount: number }> = [
      { label: 'Program Fee', amount: programFee },
    ];
    if (registrationFee > 0) {
      breakdown.push({ label: 'Registration Fee', amount: registrationFee });
    }

    // Coupon validation
    if (body.couponCode) {
      const coupon = await db.coupon.findUnique({ where: { code: body.couponCode } });
      if (!coupon) throw AppError.badRequest('Invalid coupon code');
      if (coupon.expiresAt && coupon.expiresAt < new Date()) throw AppError.badRequest('Coupon has expired');
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw AppError.badRequest('Coupon usage limit reached');

      const discount = coupon.discountType === 'PERCENTAGE'
        ? (programFee * coupon.discountValue) / 100
        : coupon.discountValue;

      if (coupon.scope === 'PROGRAM_FEE' || coupon.scope === 'BOTH') {
        couponDiscount = Math.min(discount, programFee);
      } else if (coupon.scope === 'REGISTRATION_FEE') {
        couponDiscount = Math.min(discount, registrationFee);
      }

      if (couponDiscount > 0) {
        breakdown.push({ label: `Coupon (${body.couponCode})`, amount: -couponDiscount });
      }

      // Increment coupon usage
      await db.coupon.update({
        where: { id: coupon.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    const totalDue = Math.max(0, programFee + registrationFee - couponDiscount);

    // GP-02: Auto-create or link lead
    let lead = await db.lead.findUnique({ where: { email: body.email } });
    if (!lead) {
      lead = await db.lead.create({
        data: {
          parentName: body.parentName,
          email: body.email,
          phone: body.phone,
          childName: body.childName,
          childAge: body.childAge,
          source: 'WEBSITE',
          status: 'ENROLLED',
          interestedProgramId: body.programId,
        },
      });
    } else {
      // GP-04: Auto-advance lead status
      await db.lead.update({
        where: { id: lead.id },
        data: { status: 'ENROLLED' },
      });
    }

    // Create enrollment + payment in transaction
    const enrollment = await db.$transaction(async (tx) => {
      const enroll = await tx.enrollment.create({
        data: {
          programId: body.programId,
          parentName: body.parentName,
          parentEmail: body.email,
          parentPhone: body.phone,
          childName: body.childName,
          childAge: body.childAge,
          status: 'ACTIVE',
          totalDue,
          priceBreakdown: breakdown as unknown as Prisma.InputJsonValue,
          couponCode: body.couponCode ?? null,
          leadId: lead!.id,
        },
      });

      // HO-02: Create payment record
      await tx.payment.create({
        data: {
          enrollmentId: enroll.id,
          status: 'PENDING',
          amountDue: totalDue,
          amountReceived: 0,
        },
      });

      return enroll;
    });

    // HO-03: Trigger enrollment confirmation email
    let emailSent = false;
    try {
      const logId = await sendTriggeredEmail(
        'ENROLLMENT_COMPLETED',
        body.email,
        body.parentName,
        {
          parentName: body.parentName,
          childName: body.childName,
          programName: program.name,
          totalDue: totalDue.toString(),
        }
      );
      emailSent = logId !== null;
    } catch {
      // Non-blocking
    }

    return createdResponse({
      enrollmentId: enrollment.id,
      programName: program.name,
      parentName: body.parentName,
      childName: body.childName,
      totalDue,
      paymentStatus: 'pending',
      confirmationEmailSent: emailSent,
    });
  },
});
