import { z } from 'zod';

// ── Program Schemas ──

export const ProgramListQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'closed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ProgramListQuery = z.infer<typeof ProgramListQuerySchema>;

export const ProgramRequestSchema = z
  .object({
    name: z.string().min(1, 'Program name is required'),
    ageGroupMin: z.number().int().min(0),
    ageGroupMax: z.number().int().min(0),
    totalSessions: z.number().int().min(1),
    sessionDuration: z.number().min(1),
    location: z.string().min(1, 'Location is required'),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    capacity: z.number().int().min(1),
    status: z.enum(['draft', 'active', 'closed']),
    baseFee: z.number().min(0),
    feeType: z.enum(['total', 'per_session']),
    registrationFee: z.number().min(0).optional(),
    registrationFeeRequired: z.boolean(),
    trialAvailable: z.boolean(),
  })
  .refine((data) => data.ageGroupMax >= data.ageGroupMin, {
    message: 'Max age must be >= min age',
    path: ['ageGroupMax'],
  });
export type ProgramRequest = z.infer<typeof ProgramRequestSchema>;

// ── Coupon Schemas ──

export const CouponRequestSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  discountType: z.enum(['percentage', 'flat']),
  discountValue: z.number().min(0),
  scope: z.enum(['program_fee', 'registration_fee', 'both']),
  expiresAt: z.string().datetime().optional(),
  usageLimit: z.number().int().min(1).optional(),
});
export type CouponRequest = z.infer<typeof CouponRequestSchema>;
