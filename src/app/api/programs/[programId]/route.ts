/**
 * @purpose Get / Update a program (admin)
 * @inputs  GET: programId (path) | PUT: programId (path) + ProgramRequest
 * @outputs ProgramResponse
 * @sideEffects PUT: Program UPDATE
 * @errors  401, 404, 400, 500
 */
import {
  createHandler, authSession, requireRole,
  validateBody, getParsedBody,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { ProgramRequestSchema, type ProgramRequest } from '@/schemas/program.schema';
import type { ProgramStatus, FeeType } from '@prisma/client';

function computeTotalFee(baseFee: number, feeType: string, totalSessions: number): number {
  return feeType === 'PER_SESSION' ? baseFee * totalSessions : baseFee;
}

function formatProgram(p: any) {
  return {
    programId: p.id,
    name: p.name,
    ageGroupMin: p.ageGroupMin ?? 0,
    ageGroupMax: p.ageGroupMax ?? 18,
    totalSessions: p.totalSessions,
    sessionDuration: p.sessionDuration ?? 0,
    location: p.location ?? '',
    startDate: p.startDate?.toISOString() ?? '',
    endDate: p.endDate?.toISOString() ?? '',
    capacity: p.capacity,
    status: p.status.toLowerCase(),
    baseFee: p.baseFee,
    feeType: p.feeType.toLowerCase(),
    totalFee: computeTotalFee(p.baseFee, p.feeType, p.totalSessions),
    registrationFee: p.registrationFee ?? null,
    registrationFeeRequired: p.registrationFeeRequired,
    trialAvailable: p.trialAvailable,
    locationId: p.locationId,
    enrollmentCount: p._count?.enrollments ?? 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async (_req, ctx) => {
    const programId = ctx.params?.programId as string;
    const program = await db.program.findUnique({
      where: { id: programId },
      include: { _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
    });
    if (!program) throw AppError.notFound('Program not found');
    return successResponse(formatProgram(program));
  },
});

export const PUT = createHandler({
  middleware: [authSession, requireRole('admin'), validateBody(ProgramRequestSchema)],
  handler: async (req, ctx) => {
    const programId = ctx.params?.programId as string;
    const body = getParsedBody<ProgramRequest>(req);

    const existing = await db.program.findUnique({ where: { id: programId } });
    if (!existing) throw AppError.notFound('Program not found');

    const program = await db.program.update({
      where: { id: programId },
      data: {
        name: body.name,
        ageGroupMin: body.ageGroupMin,
        ageGroupMax: body.ageGroupMax,
        totalSessions: body.totalSessions,
        sessionDuration: body.sessionDuration,
        location: body.location,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        capacity: body.capacity,
        status: body.status.toUpperCase() as ProgramStatus,
        baseFee: body.baseFee,
        feeType: body.feeType.toUpperCase() as FeeType,
        registrationFee: body.registrationFee ?? 0,
        registrationFeeRequired: body.registrationFeeRequired,
        trialAvailable: body.trialAvailable,
      },
      include: { _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
    });

    return successResponse(formatProgram(program));
  },
});
