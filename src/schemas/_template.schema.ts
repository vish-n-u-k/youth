// ============================================
// SCHEMA TEMPLATE
// ============================================
// Copy this file and rename for new domain entities
// Example: product.schema.ts, order.schema.ts
// ============================================

import { z } from 'zod';

// 1. Define enums (if any) - must match Prisma enums
export const exampleStatusSchema = z.enum(['PENDING', 'ACTIVE', 'COMPLETED']);
export type ExampleStatus = z.infer<typeof exampleStatusSchema>;

// 2. Define base schema (matches Prisma model)
export const exampleSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  status: exampleStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// 3. Define operation-specific schemas
export const createExampleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  status: exampleStatusSchema.optional(), // Will use Prisma default
});

export const updateExampleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: exampleStatusSchema.optional(),
});

export const exampleIdSchema = z.object({
  id: z.string().cuid('Invalid ID'),
});

// 4. Define list/filter schemas
export const listExamplesSchema = z.object({
  status: exampleStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// 5. Export inferred types
export type Example = z.infer<typeof exampleSchema>;
export type CreateExample = z.infer<typeof createExampleSchema>;
export type UpdateExample = z.infer<typeof updateExampleSchema>;
export type ExampleId = z.infer<typeof exampleIdSchema>;
export type ListExamplesParams = z.infer<typeof listExamplesSchema>;
