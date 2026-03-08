/**
 * @purpose List lead notes (GET) and add a note (POST)
 * @inputs  leadId (path), AddLeadNoteRequest (POST body)
 * @outputs GET: { notes[] }, POST: 201 with created note
 * @sideEffects LeadNote CREATE (POST)
 * @errors  401, 404, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
  validateBody,
  getParsedBody,
} from '@/server/middleware';
import { successResponse, createdResponse } from '@/server/lib/apiResponse';
import { AppError } from '@/server/errors';
import { db } from '@/server/db/client';
import { AddLeadNoteRequestSchema, type AddLeadNoteRequest } from '@/schemas/lead.schema';

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async (_req, ctx) => {
    const leadId = ctx.params?.leadId as string;

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw AppError.notFound('Lead');

    const notes = await db.leadNote.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({
      notes: notes.map((n) => ({
        noteId: n.id,
        text: n.text,
        author: n.author,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  },
});

export const POST = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(AddLeadNoteRequestSchema),
  ],
  handler: async (req, ctx) => {
    const leadId = ctx.params?.leadId as string;
    const body = getParsedBody<AddLeadNoteRequest>(req);

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw AppError.notFound('Lead');

    const note = await db.leadNote.create({
      data: {
        leadId,
        text: body.text,
        author: ctx.admin!.name,
      },
    });

    return createdResponse({
      noteId: note.id,
      text: note.text,
      author: note.author,
      createdAt: note.createdAt.toISOString(),
    });
  },
});
