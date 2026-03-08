import { z } from 'zod';

// ── Lead Query/Request Schemas ──

export const LeadListQuerySchema = z.object({
  status: z
    .enum([
      'new',
      'contacted',
      'trial_scheduled',
      'trial_attended',
      'enrolled',
      'dropped',
      'not_interested',
    ])
    .optional(),
  source: z.enum(['facebook', 'google', 'website', 'manual']).optional(),
  programId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type LeadListQuery = z.infer<typeof LeadListQuerySchema>;

export const UpdateLeadRequestSchema = z.object({
  parentName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  childName: z.string().optional(),
  childAge: z.number().int().min(0).max(18).optional(),
  interestedProgram: z.string().optional(),
});
export type UpdateLeadRequest = z.infer<typeof UpdateLeadRequestSchema>;

export const UpdateLeadStatusRequestSchema = z.object({
  status: z.enum([
    'new',
    'contacted',
    'trial_scheduled',
    'trial_attended',
    'enrolled',
    'dropped',
    'not_interested',
  ]),
});
export type UpdateLeadStatusRequest = z.infer<typeof UpdateLeadStatusRequestSchema>;

export const AddLeadNoteRequestSchema = z.object({
  text: z.string().min(1),
});
export type AddLeadNoteRequest = z.infer<typeof AddLeadNoteRequestSchema>;

export const SendTrialLinkRequestSchema = z.object({
  programId: z.string().optional(),
});
export type SendTrialLinkRequest = z.infer<typeof SendTrialLinkRequestSchema>;
