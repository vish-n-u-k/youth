/**
 * @purpose List calendar dates with filters / Create a new calendar date (admin)
 * @inputs  GET: CalendarDatesQuery | POST: CalendarDateRequest
 * @outputs GET: { dates: CalendarDateResponse[] } | POST: CalendarDateResponse (201)
 * @sideEffects POST: CalendarDate CREATE
 * @errors  401, 400, 404, 500
 */
import {
  createHandler, authSession, requireRole,
  validateQuery, getParsedQuery, validateBody, getParsedBody,
} from '@/server/middleware';
import { successResponse, createdResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import {
  CalendarDatesQuerySchema, type CalendarDatesQuery,
  CalendarDateRequestSchema, type CalendarDateRequest,
} from '@/schemas/calendar.schema';
import type { Prisma } from '@prisma/client';

function formatCalendarDate(d: any) {
  const nonCancelledTrials = d._count?.trials ?? 0;
  return {
    dateId: d.id,
    date: d.date.toISOString(),
    programId: d.programId,
    programName: d.program?.name ?? '',
    trialEligible: d.trialEligible,
    capacity: d.capacity,
    spotsRemaining: d.capacity - nonCancelledTrials,
    notes: d.notes ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export const GET = createHandler({
  middleware: [authSession, requireRole('admin'), validateQuery(CalendarDatesQuerySchema)],
  handler: async (req) => {
    const query = getParsedQuery<CalendarDatesQuery>(req);

    const where: Prisma.CalendarDateWhereInput = {};
    if (query.programId) {
      where.programId = query.programId;
    }
    if (query.month || query.year) {
      const now = new Date();
      const year = query.year ?? now.getFullYear();
      const month = query.month ?? 1;

      const startDate = new Date(year, month - 1, 1);
      const endDate = query.month
        ? new Date(year, month, 1)
        : new Date(year + 1, 0, 1);

      where.date = { gte: startDate, lt: endDate };
    }

    const dates = await db.calendarDate.findMany({
      where,
      include: {
        program: { select: { name: true } },
        _count: { select: { trials: { where: { status: { not: 'CANCELLED' } } } } },
      },
      orderBy: { date: 'asc' },
    });

    return successResponse({ dates: dates.map(formatCalendarDate) });
  },
});

export const POST = createHandler({
  middleware: [authSession, requireRole('admin'), validateBody(CalendarDateRequestSchema)],
  handler: async (req) => {
    const body = getParsedBody<CalendarDateRequest>(req);

    const program = await db.program.findUnique({ where: { id: body.programId } });
    if (!program) throw AppError.notFound('Program');

    const calendarDate = await db.calendarDate.create({
      data: {
        date: new Date(body.date),
        programId: body.programId,
        trialEligible: body.trialEligible,
        capacity: program.capacity,
        notes: body.notes ?? null,
      },
      include: {
        program: { select: { name: true } },
        _count: { select: { trials: { where: { status: { not: 'CANCELLED' } } } } },
      },
    });

    return createdResponse(formatCalendarDate(calendarDate));
  },
});
