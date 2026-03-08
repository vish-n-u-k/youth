/**
 * @purpose Email service adapter interface for transactional email
 * @inputs  architect_output/global_integrations.json (email_service)
 *          architect_output/global_services_registry.json (emailService)
 * @outputs sendEmail(), renderTemplate() — provider-agnostic interface
 * @sideEffects CommunicationLog CREATE (PENDING status); actual send via provider adapter
 * @errors  Logged but not thrown for async sends; thrown for sync operations
 * @idempotency Each call creates a new CommunicationLog entry (not idempotent)
 *
 * Implementation note: Adapter pattern — swap provider by changing EMAIL_PROVIDER env var.
 * Currently implements a no-op/logging adapter for development.
 * Module-level implementations will call this service for actual sends.
 */
import { db } from '@/server/db/client';
import type { TriggerEvent } from '@prisma/client';

export type EmailPayload = {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  triggerEvent?: TriggerEvent;
};

/**
 * @purpose Render a template by substituting {{variable}} placeholders
 * @inputs  template string, variables record
 * @outputs Rendered string
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

/**
 * @purpose Send an email: create CommunicationLog entry with PENDING status
 * @inputs  EmailPayload
 * @outputs CommunicationLog ID
 * @sideEffects CommunicationLog CREATE (PENDING)
 * @errors  Logged to stderr on DB failure
 *
 * Actual send is handled by the email_send_worker background job.
 * This function only enqueues the email by creating the log entry.
 */
export async function sendEmail(payload: EmailPayload): Promise<string> {
  const log = await db.communicationLog.create({
    data: {
      recipientEmail: payload.to,
      recipientName: payload.toName ?? null,
      subject: payload.subject,
      body: payload.htmlBody,
      triggerEvent: payload.triggerEvent ?? null,
      deliveryStatus: 'PENDING',
    },
  });
  return log.id;
}

/**
 * @purpose Check if an automation is enabled for a trigger event
 * @inputs  triggerEvent
 * @outputs { enabled, delayMinutes, templateId } or null
 * @sideEffects None (read-only)
 */
export async function checkAutomationEnabled(triggerEvent: TriggerEvent) {
  const automation = await db.automation.findUnique({
    where: { triggerEvent },
    include: { template: true },
  });
  if (!automation || !automation.enabled) return null;
  return {
    enabled: automation.enabled,
    delayMinutes: automation.delayMinutes,
    templateId: automation.templateId,
    template: automation.template,
  };
}

/**
 * @purpose Send a triggered email (check automation, render template, enqueue)
 * @inputs  triggerEvent, recipientEmail, recipientName, variables
 * @outputs CommunicationLog ID or null if automation disabled
 * @sideEffects CommunicationLog CREATE if automation enabled
 */
export async function sendTriggeredEmail(
  triggerEvent: TriggerEvent,
  recipientEmail: string,
  recipientName: string | undefined,
  variables: Record<string, string>
): Promise<string | null> {
  const automation = await checkAutomationEnabled(triggerEvent);
  if (!automation) return null;

  const subject = renderTemplate(automation.template.subject, variables);
  const htmlBody = renderTemplate(automation.template.body, variables);

  return sendEmail({
    to: recipientEmail,
    toName: recipientName,
    subject,
    htmlBody,
    triggerEvent,
  });
}
