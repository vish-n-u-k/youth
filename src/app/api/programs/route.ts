/**
 * @purpose List programs with filters / Create a new program (admin)
 * @inputs  GET: ProgramListQuery | POST: ProgramRequest
 * @outputs GET: ProgramListResponse | POST: ProgramResponse (201)
 * @sideEffects POST: Program CREATE
 * @errors  401, 400, 500
 */
import {
  createHandler, authSession, requireRole,
  validateQuery, getParsedQuery, validateBody, getParsedBody,
} from '@/server/middleware';
import { successResponse, createdResponse } from '@/server/lib/apiResponse';
import { db } from '@/server/db/client';
import {
  ProgramListQuerySchema, type ProgramListQuery,
  ProgramRequestSchema, type ProgramRequest,
} from '@/schemas/program.schema';
import type { Prisma, ProgramStatus, FeeType } from '@prisma/client';

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
  middleware: [authSession, requireRole('admin'), validateQuery(ProgramListQuerySchema)],
  handler: async (req) => {
    const query = getParsedQuery<ProgramListQuery>(req);

    const where: Prisma.ProgramWhereInput = {};
    if (query.status) {
      where.status = query.status.toUpperCase() as ProgramStatus;
    }

    const [programs, total] = await Promise.all([
      db.program.findMany({
        where,
        include: { _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
        orderBy: { startDate: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.program.count({ where }),
    ]);

    return successResponse({
      programs: programs.map((p) => ({
        programId: p.id,
        name: p.name,
        ageGroupMin: p.ageGroupMin ?? 0,
        ageGroupMax: p.ageGroupMax ?? 18,
        startDate: p.startDate?.toISOString() ?? '',
        endDate: p.endDate?.toISOString() ?? '',
        enrollmentCount: p._count.enrollments,
        capacity: p.capacity,
        status: p.status.toLowerCase(),
        totalFee: computeTotalFee(p.baseFee, p.feeType, p.totalSessions),
      })),
      total,
      page: query.page,
      limit: query.limit,
    });
  },
});

export const POST = createHandler({
  middleware: [authSession, requireRole('admin'), validateBody(ProgramRequestSchema)],
  handler: async (req, ctx) => {
    const body = getParsedBody<ProgramRequest>(req);

    // Get location for the admin
    const location = await db.locationSettings.findFirst();
    if (!location) {
      const { AppError } = await import('@/server/errors');
      throw AppError.badRequest('No location configured. Please set up location settings first.');
    }

    const program = await db.program.create({
      data: {
        name: body.name,
        ageGroupMin: body.ageGroupMin,
        ageGroupMax: body.ageGroupMax,
        totalSessions: body.totalSessions,
        sessionDuration: body.sessionDuration,
        location: body.location,
        locationId: location.id,
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
      include: { _count: { select: { enrollments: true } } },
    });

    return createdResponse(formatProgram(program));
  },
});
