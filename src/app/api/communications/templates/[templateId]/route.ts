/**
 * @purpose Get single template / Update a template
 * @inputs  GET: templateId (path) | PUT: templateId (path) + TemplateRequest
 * @outputs TemplateResponse
 * @sideEffects PUT: Template UPDATE
 * @errors  401, 404, 400 (validation), 500
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
import { TemplateRequestSchema, type TemplateRequest } from '@/schemas/communication.schema';

function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async (_req, ctx) => {
    const templateId = ctx.params?.templateId as string;
    const template = await db.template.findUnique({ where: { id: templateId } });
    if (!template) throw AppError.notFound('Template not found');

    return successResponse({
      templateId: template.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      availableVariables: extractVariables(template.body),
      isDefault: template.isDefault,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  },
});

export const PUT = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(TemplateRequestSchema),
  ],
  handler: async (req, ctx) => {
    const templateId = ctx.params?.templateId as string;
    const body = getParsedBody<TemplateRequest>(req);

    const existing = await db.template.findUnique({ where: { id: templateId } });
    if (!existing) throw AppError.notFound('Template not found');

    const template = await db.template.update({
      where: { id: templateId },
      data: {
        name: body.name,
        subject: body.subject,
        body: body.body,
      },
    });

    return successResponse({
      templateId: template.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      availableVariables: extractVariables(template.body),
      isDefault: template.isDefault,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  },
});
