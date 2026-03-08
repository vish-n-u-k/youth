/**
 * @purpose Get lead detail (GET) and update lead (PUT)
 * @inputs  leadId (path), UpdateLeadRequest (PUT body)
 * @outputs LeadResponse
 * @sideEffects Lead UPDATE (PUT)
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
import { UpdateLeadRequestSchema, type UpdateLeadRequest } from '@/schemas/lead.schema';
import type { LeadStatus, LeadSource } from '@prisma/client';

function formatLead(lead: {
  id: string;
  parentName: string;
  email: string;
  phone: string | null;
  childName: string | null;
  childAge: number | null;
  source: LeadSource;
  status: LeadStatus;
  interestedProgramId: string | null;
  interestedProgram?: { name: string } | null;
  locationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    leadId: lead.id,
    parentName: lead.parentName,
    email: lead.email,
    phone: lead.phone ?? null,
    childName: lead.childName ?? null,
    childAge: lead.childAge ?? null,
    source: lead.source.toLowerCase(),
    status: lead.status.toLowerCase(),
    interestedProgramId: lead.interestedProgramId ?? null,
    interestedProgramName: lead.interestedProgram?.name ?? null,
    locationId: lead.locationId ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async (_req, ctx) => {
    const leadId = ctx.params?.leadId as string;

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        interestedProgram: { select: { name: true } },
      },
    });
    if (!lead) throw AppError.notFound('Lead');

    return successResponse(formatLead(lead));
  },
});

export const PUT = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(UpdateLeadRequestSchema),
  ],
  handler: async (req, ctx) => {
    const leadId = ctx.params?.leadId as string;
    const body = getParsedBody<UpdateLeadRequest>(req);

    const existing = await db.lead.findUnique({ where: { id: leadId } });
    if (!existing) throw AppError.notFound('Lead');

    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        parentName: body.parentName,
        email: body.email,
        phone: body.phone,
        childName: body.childName,
        childAge: body.childAge,
        interestedProgramId: body.interestedProgram,
      },
      include: {
        interestedProgram: { select: { name: true } },
      },
    });

    return successResponse(formatLead(updated));
  },
});
