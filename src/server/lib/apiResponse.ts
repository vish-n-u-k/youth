/**
 * @purpose Standardized API response helpers
 * @inputs  architect_output/global_security_policies.json (errorHandling.errorFormat)
 * @outputs JSON NextResponse objects with consistent envelope
 */
import { NextResponse } from 'next/server';
import { AppError, ValidationError } from '@/server/errors';

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Never leak stack traces or internals to client
  console.error('[API Error]', error);
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
    { status: 500 }
  );
}
