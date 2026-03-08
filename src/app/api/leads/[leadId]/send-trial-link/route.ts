/**
 * @purpose Send trial booking link to a lead (admin)
 * @inputs  leadId (path), SendTrialLinkRequest { programId? }
 * @outputs { message, emailSent }
 * @sideEffects CommunicationLog CREATE (via emailService), LeadActivity CREATE
 * @errors  401, 404, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
  validateBody,
  getParsedBody,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { sendEmail } from '@/server/services/emailService';
import { SendTrialLinkRequestSchema, type SendTrialLinkRequest } from '@/schemas/lead.schema';

export const POST = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(SendTrialLinkRequestSchema),
  ],
  handler: async (req, ctx) => {
    const leadId = ctx.params?.leadId as string;
    const body = getParsedBody<SendTrialLinkRequest>(req);

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        interestedProgram: { select: { name: true } },
      },
    });
    if (!lead) throw AppError.notFound('Lead');

    const programId = body.programId ?? lead.interestedProgramId;
    let programName = lead.interestedProgram?.name ?? 'our program';

    // If a different programId was supplied, look up its name
    if (body.programId && body.programId !== lead.interestedProgramId) {
      const program = await db.program.findUnique({
        where: { id: body.programId },
        select: { name: true },
      });
      if (program) programName = program.name;
    }

    const trialLink = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.example.com'}/book-trial${programId ? `?programId=${programId}` : ''}`;

    let emailSent = false;
    try {
      await sendEmail({
        to: lead.email,
        toName: lead.parentName,
        subject: `Book your trial class for ${programName}`,
        htmlBody: `
          <p>Hi ${lead.parentName},</p>
          <p>We'd love for you to experience <strong>${programName}</strong>! Click the link below to book a trial class:</p>
          <p><a href="${trialLink}">${trialLink}</a></p>
          <p>Looking forward to seeing you!</p>
        `.trim(),
      });
      emailSent = true;
    } catch (error) {
      console.error('[send-trial-link] Email send failed:', error);
    }

    // Record activity
    await db.leadActivity.create({
      data: {
        leadId,
        type: 'EMAIL_SENT',
        description: `Trial booking link sent for ${programName}`,
        metadata: { programId, emailSent },
      },
    });

    return successResponse({
      message: emailSent
        ? 'Trial link sent successfully'
        : 'Trial link email could not be sent',
      emailSent,
    });
  },
});
