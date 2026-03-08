import { z } from 'zod';

// ── Admin Query/Request Schemas ──

export const AdminEnrollmentListQuerySchema = z.object({
  status: z.enum(['active', 'cancelled', 'completed']).optional(),
  programId: z.string().optional(),
  paymentStatus: z.enum(['pending', 'paid', 'partial', 'waived']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminEnrollmentListQuery = z.infer<typeof AdminEnrollmentListQuerySchema>;

export const UpdateEnrollmentStatusRequestSchema = z
  .object({
    status: z.enum(['active', 'cancelled', 'completed']),
    cancellationReason: z.string().optional(),
  })
  .refine(
    (data) => data.status !== 'cancelled' || (data.cancellationReason && data.cancellationReason.length > 0),
    { message: 'Cancellation reason is required when cancelling', path: ['cancellationReason'] }
  );
export type UpdateEnrollmentStatusRequest = z.infer<typeof UpdateEnrollmentStatusRequestSchema>;

// ── Public Request Schemas ──

export const PriceBreakdownRequestSchema = z.object({
  couponCode: z.string().optional(),
});
export type PriceBreakdownRequest = z.infer<typeof PriceBreakdownRequestSchema>;

export const TrialBookingRequestSchema = z.object({
  programId: z.string(),
  parentName: z.string().min(1, 'Parent name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  childName: z.string().min(1, 'Child name is required'),
  childAge: z.number().int().min(0).max(18),
  trialDateId: z.string(),
});
export type TrialBookingRequest = z.infer<typeof TrialBookingRequestSchema>;

export const EnrollmentRequestSchema = z.object({
  programId: z.string(),
  parentName: z.string().min(1, 'Parent name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  childName: z.string().min(1, 'Child name is required'),
  childAge: z.number().int().min(0).max(18),
  couponCode: z.string().optional(),
});
export type EnrollmentRequest = z.infer<typeof EnrollmentRequestSchema>;
