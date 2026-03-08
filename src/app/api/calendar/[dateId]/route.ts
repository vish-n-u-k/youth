/**
 * @purpose Update / Delete a calendar date (admin)
 * @inputs  PUT: dateId (path) + CalendarDateRequest | DELETE: dateId (path)
 * @outputs PUT: CalendarDateResponse | DELETE: { message, deleted }
 * @sideEffects PUT: CalendarDate UPDATE | DELETE: CalendarDate DELETE
 * @errors  401, 404, 400, 409, 500
 */
import {
  createHandler, authSession, requireRole,
  validateBody, getParsedBody,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { CalendarDateRequestSchema, type CalendarDateRequest } from '@/schemas/calendar.schema';

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

export const PUT = createHandler({
  middleware: [authSession, requireRole('admin'), validateBody(CalendarDateRequestSchema)],
  handler: async (req, ctx) => {
    const dateId = ctx.params?.dateId as string;
    const body = getParsedBody<CalendarDateRequest>(req);

    const existing = await db.calendarDate.findUnique({ where: { id: dateId } });
    if (!existing) throw AppError.notFound('CalendarDate');

    const program = await db.program.findUnique({ where: { id: body.programId } });
    if (!program) throw AppError.notFound('Program');

    const calendarDate = await db.calendarDate.update({
      where: { id: dateId },
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

    return successResponse(formatCalendarDate(calendarDate));
  },
});

export const DELETE = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async (_req, ctx) => {
    const dateId = ctx.params?.dateId as string;

    const existing = await db.calendarDate.findUnique({
      where: { id: dateId },
      include: { _count: { select: { trials: true } } },
    });
    if (!existing) throw AppError.notFound('CalendarDate');

    if (existing._count.trials > 0) {
      throw AppError.conflict('Cannot delete calendar date with linked trials');
    }

    await db.calendarDate.delete({ where: { id: dateId } });

    return successResponse({ message: 'Calendar date deleted', deleted: true });
  },
});
