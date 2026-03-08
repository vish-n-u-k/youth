import { z } from 'zod';

// ── Request Schemas ──

export const TemplateRequestSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});
export type TemplateRequest = z.infer<typeof TemplateRequestSchema>;

export const AutomationRequestSchema = z.object({
  triggerEvent: z.enum([
    'lead_created',
    'trial_scheduled',
    'trial_approaching',
    'enrollment_completed',
    'payment_overdue',
    'class_start_approaching',
  ]),
  templateId: z.string().min(1, 'Template ID is required'),
  delayMinutes: z.number().int().min(0).optional(),
  enabled: z.boolean(),
});
export type AutomationRequest = z.infer<typeof AutomationRequestSchema>;

export const CommunicationsLogQuerySchema = z.object({
  deliveryStatus: z.enum(['sent', 'failed', 'pending']).optional(),
  triggerEvent: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type CommunicationsLogQuery = z.infer<typeof CommunicationsLogQuerySchema>;
