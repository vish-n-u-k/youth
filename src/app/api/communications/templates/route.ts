/**
 * @purpose List all email templates / Create a custom template
 * @inputs  GET: none | POST: TemplateRequest { name, subject, body }
 * @outputs GET: TemplateListResponse | POST: TemplateResponse (201)
 * @sideEffects POST: Template CREATE
 * @errors  401 (unauthenticated), 400 (validation), 500 (internal)
 */
import {
  createHandler,
  authSession,
  requireRole,
  validateBody,
  getParsedBody,
} from '@/server/middleware';
import { successResponse, createdResponse } from '@/server/lib/apiResponse';
import { db } from '@/server/db/client';
import { TemplateRequestSchema, type TemplateRequest } from '@/schemas/communication.schema';

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async () => {
    const templates = await db.template.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        subject: true,
        triggerEvent: true,
        isDefault: true,
        updatedAt: true,
      },
    });

    return successResponse({
      templates: templates.map((t) => ({
        templateId: t.id,
        name: t.name,
        subject: t.subject,
        triggerEvent: t.triggerEvent?.toLowerCase() ?? null,
        isDefault: t.isDefault,
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  },
});

/** Extract {{variable}} names from template body */
function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

export const POST = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(TemplateRequestSchema),
  ],
  handler: async (req) => {
    const body = getParsedBody<TemplateRequest>(req);

    const template = await db.template.create({
      data: {
        name: body.name,
        subject: body.subject,
        body: body.body,
        isDefault: false,
      },
    });

    return createdResponse({
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
