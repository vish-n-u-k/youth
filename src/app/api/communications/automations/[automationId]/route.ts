/**
 * @purpose Update an automation rule (template, delay, enable/disable)
 * @inputs  automationId (path) + AutomationRequest { triggerEvent, templateId, delayMinutes?, enabled }
 * @outputs AutomationResponse
 * @sideEffects Automation UPDATE, AuditLog CREATE
 * @errors  401, 404, 400 (validation), 500
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
import { AutomationRequestSchema, type AutomationRequest } from '@/schemas/communication.schema';
import type { TriggerEvent } from '@prisma/client';

export const PUT = createHandler({
  middleware: [
    authSession,
    requireRole('admin'),
    validateBody(AutomationRequestSchema),
    auditAction({ action: 'automation_update', resourceType: 'Automation' }),
  ],
  handler: async (req, ctx) => {
    const automationId = ctx.params?.automationId as string;
    const body = getParsedBody<AutomationRequest>(req);

    const existing = await db.automation.findUnique({ where: { id: automationId } });
    if (!existing) throw AppError.notFound('Automation not found');

    // Validate that the templateId references a real template
    const template = await db.template.findUnique({ where: { id: body.templateId } });
    if (!template) throw AppError.badRequest('Referenced template does not exist');

    const automation = await db.automation.update({
      where: { id: automationId },
      data: {
        triggerEvent: body.triggerEvent.toUpperCase() as TriggerEvent,
        templateId: body.templateId,
        delayMinutes: body.delayMinutes ?? 0,
        enabled: body.enabled,
      },
      include: { template: { select: { name: true } } },
    });

    return successResponse({
      automationId: automation.id,
      triggerEvent: automation.triggerEvent.toLowerCase(),
      templateId: automation.templateId,
      templateName: automation.template.name,
      delayMinutes: automation.delayMinutes || null,
      enabled: automation.enabled,
      updatedAt: automation.updatedAt.toISOString(),
    });
  },
});
