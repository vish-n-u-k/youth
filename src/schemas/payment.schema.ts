import { z } from 'zod';

// ── Payment Query/Request Schemas ──

export const PaymentListQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'partial', 'waived']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type PaymentListQuery = z.infer<typeof PaymentListQuerySchema>;

export const UpdatePaymentRequestSchema = z.object({
  status: z.enum(['pending', 'paid', 'partial', 'waived']),
  amountReceived: z.number().min(0),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});
export type UpdatePaymentRequest = z.infer<typeof UpdatePaymentRequestSchema>;
