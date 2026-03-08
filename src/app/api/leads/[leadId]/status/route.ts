/**
 * @purpose Update lead status (admin)
 * @inputs  leadId (path) + UpdateLeadStatusRequest { status }
 * @outputs LeadResponse
 * @sideEffects Lead UPDATE, AuditLog CREATE
 * @errors  401, 404, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
  validateBody,
  getParsedBody,
  auditAction,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { UpdateLeadStatusRequestSchema, type UpdateLeadStatusRequest } from '@/schemas/lead.schema';
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

export const PATCH = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(UpdateLeadStatusRequestSchema),
    auditAction({ action: 'lead_status_change', resourceType: 'Lead' }),
  ],
  handler: async (req, ctx) => {
    const leadId = ctx.params?.leadId as string;
    const body = getParsedBody<UpdateLeadStatusRequest>(req);

    const existing = await db.lead.findUnique({ where: { id: leadId } });
    if (!existing) throw AppError.notFound('Lead');

    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        status: body.status.toUpperCase() as LeadStatus,
      },
      include: {
        interestedProgram: { select: { name: true } },
      },
    });

    return successResponse(formatLead(updated));
  },
});
