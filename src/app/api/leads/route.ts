/**
 * @purpose List all leads with filters, search, pagination (admin)
 * @inputs  LeadListQuery { status?, source?, programId?, search?, page, limit }
 * @outputs { leads[], total, page, limit }
 * @sideEffects None (read-only)
 * @errors  401, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
  validateQuery,
  getParsedQuery,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { db } from '@/server/db/client';
import { LeadListQuerySchema, type LeadListQuery } from '@/schemas/lead.schema';
import type { Prisma, LeadStatus, LeadSource } from '@prisma/client';

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
  middleware: [
    authSession,
    requireRole('admin'),
    validateQuery(LeadListQuerySchema),
  ],
  handler: async (req) => {
    const query = getParsedQuery<LeadListQuery>(req);

    const where: Prisma.LeadWhereInput = {};
    if (query.status) {
      where.status = query.status.toUpperCase() as LeadStatus;
    }
    if (query.source) {
      where.source = query.source.toUpperCase() as LeadSource;
    }
    if (query.programId) {
      where.interestedProgramId = query.programId;
    }
    if (query.search) {
      where.OR = [
        { parentName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          interestedProgram: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.lead.count({ where }),
    ]);

    return successResponse({
      leads: leads.map(formatLead),
      total,
      page: query.page,
      limit: query.limit,
    });
  },
});
