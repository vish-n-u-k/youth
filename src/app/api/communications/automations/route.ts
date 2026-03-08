/**
 * @purpose List all automation rules with their linked template names
 * @inputs  Authenticated admin session
 * @outputs AutomationListResponse
 * @sideEffects None (read-only)
 * @errors  401, 500
 */
import {
  createHandler,
  authSession,
  requireRole,
} from '@/server/middleware';
import { successResponse } from '@/server/lib/apiResponse';
import { db } from '@/server/db/client';

export const GET = createHandler({
  middleware: [authSession, requireRole('admin')],
  handler: async () => {
    const automations = await db.automation.findMany({
      include: { template: { select: { name: true } } },
      orderBy: { triggerEvent: 'asc' },
    });

    return successResponse({
      automations: automations.map((a) => ({
        automationId: a.id,
        triggerEvent: a.triggerEvent.toLowerCase(),
        templateId: a.templateId,
        templateName: a.template.name,
        delayMinutes: a.delayMinutes || null,
        enabled: a.enabled,
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  },
});
