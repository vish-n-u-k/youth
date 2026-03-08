import { z } from 'zod';

// ── Calendar Date Schemas ──

export const CalendarDatesQuerySchema = z.object({
  programId: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
});
export type CalendarDatesQuery = z.infer<typeof CalendarDatesQuerySchema>;

export const CalendarDateRequestSchema = z.object({
  date: z.string().datetime(),
  programId: z.string(),
  trialEligible: z.boolean(),
  notes: z.string().optional(),
});
export type CalendarDateRequest = z.infer<typeof CalendarDateRequestSchema>;
