/**
 * @purpose Book a trial class for a child
 * @inputs  TrialBookingRequest { programId, parentName, email, phone, childName, childAge, trialDateId }
 * @outputs TrialBookingResponse (201)
 * @sideEffects Trial CREATE, Lead auto-create/link (GP-02/GP-04), email trigger (HO-03)
 * @policy  GP-01: one trial per child per program; capacity check on CalendarDate
 * @errors  400 (validation/capacity), 404 (program/date not found), 409 (duplicate), 500
 */
import { createHandler, rateLimit, validateBody, getParsedBody } from '@/server/middleware';
import { createdResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { sendTriggeredEmail } from '@/server/services/emailService';
import { TrialBookingRequestSchema, type TrialBookingRequest } from '@/schemas/enrollment.schema';

export const POST = createHandler({
  middleware: [rateLimit('public_write'), validateBody(TrialBookingRequestSchema)],
  handler: async (req) => {
    const body = getParsedBody<TrialBookingRequest>(req);

    // Validate program exists and is active
    const program = await db.program.findUnique({
      where: { id: body.programId, status: 'ACTIVE' },
    });
    if (!program) throw AppError.notFound('Program not found or not active');
    if (!program.trialAvailable) throw AppError.badRequest('Trial classes are not available for this program');

    // Validate trial date
    const calendarDate = await db.calendarDate.findUnique({
      where: { id: body.trialDateId },
    });
    if (!calendarDate || calendarDate.programId !== body.programId) {
      throw AppError.notFound('Trial date not found for this program');
    }
    if (!calendarDate.trialEligible) {
      throw AppError.badRequest('Selected date is not eligible for trials');
    }

    // Check capacity
    const existingTrialsCount = await db.trial.count({
      where: { trialDateId: body.trialDateId, status: { not: 'CANCELLED' } },
    });
    if (existingTrialsCount >= calendarDate.capacity) {
      throw AppError.badRequest('Selected trial date is fully booked');
    }

    // GP-01: Check duplicate trial for this child+program
    const existingTrial = await db.trial.findFirst({
      where: {
        programId: body.programId,
        parentEmail: body.email,
        childName: body.childName,
        status: { not: 'CANCELLED' },
      },
    });
    if (existingTrial) {
      throw AppError.conflict('A trial is already booked for this child at this program');
    }

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
          status: 'TRIAL_SCHEDULED',
          interestedProgramId: body.programId,
        },
      });
    } else if (lead.status === 'NEW' || lead.status === 'CONTACTED') {
      // GP-04: Auto-advance lead status
      await db.lead.update({
        where: { id: lead.id },
        data: { status: 'TRIAL_SCHEDULED' },
      });
    }

    const trial = await db.trial.create({
      data: {
        programId: body.programId,
        trialDateId: body.trialDateId,
        parentName: body.parentName,
        parentEmail: body.email,
        parentPhone: body.phone,
        childName: body.childName,
        childAge: body.childAge,
        status: 'SCHEDULED',
        leadId: lead.id,
      },
    });

    // HO-03: Trigger trial confirmation email
    let emailSent = false;
    try {
      const logId = await sendTriggeredEmail(
        'TRIAL_SCHEDULED',
        body.email,
        body.parentName,
        {
          parentName: body.parentName,
          childName: body.childName,
          programName: program.name,
          trialDate: calendarDate.date.toLocaleDateString(),
        }
      );
      emailSent = logId !== null;
    } catch {
      // Non-blocking — email failure shouldn't fail the booking
    }

    return createdResponse({
      trialId: trial.id,
      programName: program.name,
      trialDate: calendarDate.date.toISOString(),
      parentName: body.parentName,
      childName: body.childName,
      confirmationEmailSent: emailSent,
      message: 'Trial class booked successfully!',
    });
  },
});
