/**
 * @purpose Get enrollment confirmation with Zelle payment instructions
 * @inputs  enrollmentId (path)
 * @outputs EnrollmentConfirmationResponse
 * @sideEffects None (read-only)
 * @security Relies on CUID unguessability (ET-GAP-01)
 * @errors  404, 500
 */
import { createHandler, rateLimit } from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';

export const GET = createHandler({
  middleware: [rateLimit('public_read')],
  handler: async (_req, ctx) => {
    const enrollmentId = ctx.params?.enrollmentId as string;

    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        program: { select: { name: true, location: true, locationId: true } },
        payment: { select: { status: true } },
      },
    });
    if (!enrollment) throw AppError.notFound('Enrollment not found');

    // Get location settings for Zelle instructions
    const settings = await db.locationSettings.findUnique({
      where: { id: enrollment.program.locationId },
    });

    const breakdown = (enrollment.priceBreakdown as Array<{ label: string; amount: number }>) ?? [];

    return successResponse({
      enrollmentId: enrollment.id,
      programName: enrollment.program.name,
      parentName: enrollment.parentName,
      childName: enrollment.childName,
      childAge: enrollment.childAge ?? 0,
      schedule: '',
      location: enrollment.program.location ?? '',
      totalDue: enrollment.totalDue,
      priceBreakdown: breakdown,
      paymentStatus: (enrollment.payment?.status ?? 'PENDING').toLowerCase(),
      zelleInstructions: {
        recipientName: settings?.zelleRecipientName ?? '',
        contactInfo: settings?.zelleContactInfo ?? '',
        amount: enrollment.totalDue,
        referenceNote: `Enrollment ${enrollment.id} - ${enrollment.childName}`,
        customInstructions: settings?.zelleInstructions ?? null,
      },
    });
  },
});
