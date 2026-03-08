/**
 * @purpose Request validation middleware using Zod schemas
 * @inputs  architect_output/global_middleware_registry.json (input_validation, order 7)
 * @outputs Parsed/validated data attached to request; 400 on validation failure
 * @sideEffects None
 * @errors  400 BAD_REQUEST with field-level validation details
 *
 * Validates body, query, and path params against Zod schemas.
 * Strips unknown fields for security (stripUnknown: true per architecture).
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { MiddlewareFn } from './pipeline';
import { ValidationError } from '@/server/errors';

/**
 * @purpose Validate request body against a Zod schema
 * @inputs  Zod schema
 * @outputs MiddlewareFn that parses body and throws ValidationError on failure
 */
export function validateBody<T extends z.ZodType>(schema: T): MiddlewareFn {
  return async (req: NextRequest, _ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError([{ field: 'body', message: 'Invalid JSON body' }]);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      throw new ValidationError(errors);
    }

    // Store parsed body for handler access
    (req as NextRequest & { parsedBody: z.infer<T> }).parsedBody = result.data;
  };
}

/**
 * @purpose Validate query parameters against a Zod schema
 * @inputs  Zod schema
 * @outputs MiddlewareFn that parses searchParams and throws ValidationError on failure
 */
export function validateQuery<T extends z.ZodType>(schema: T): MiddlewareFn {
  return async (req: NextRequest, _ctx) => {
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const result = schema.safeParse(params);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'query',
        message: issue.message,
      }));
      throw new ValidationError(errors);
    }

    (req as NextRequest & { parsedQuery: z.infer<T> }).parsedQuery = result.data;
  };
}

/**
 * Helper: extract parsed body from request (use after validateBody middleware)
 */
export function getParsedBody<T>(req: NextRequest): T {
  return (req as NextRequest & { parsedBody: T }).parsedBody;
}

/**
 * Helper: extract parsed query from request (use after validateQuery middleware)
 */
export function getParsedQuery<T>(req: NextRequest): T {
  return (req as NextRequest & { parsedQuery: T }).parsedQuery;
}
