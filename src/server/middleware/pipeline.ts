/**
 * @purpose Composable middleware pipeline for Next.js App Router API routes
 * @inputs  architect_output/global_middleware_registry.json (execution order)
 * @outputs createHandler() HOF that chains middleware before the route handler
 *
 * Middleware execution order per architecture:
 *   1. request_id (always)
 *   2. error_handler wraps everything (catch-all)
 *   3-N. route-specific middleware (rate_limit, auth_session, rbac, validation, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/server/lib/apiResponse';

export type RequestContext = {
  requestId: string;
  admin?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  params?: Record<string, string>;
};

export type MiddlewareFn = (
  req: NextRequest,
  ctx: RequestContext
) => Promise<NextResponse | void>;

export type HandlerFn = (
  req: NextRequest,
  ctx: RequestContext
) => Promise<NextResponse>;

export type RouteConfig = {
  middleware?: MiddlewareFn[];
  handler: HandlerFn;
};

/**
 * @purpose Create a Next.js route handler with middleware pipeline
 * @inputs  RouteConfig with optional middleware chain + handler
 * @outputs Standard Next.js route handler function
 * @sideEffects Generates requestId, runs middleware chain, catches errors
 * @errors  All uncaught errors normalized to ApiError envelope via errorResponse
 */
export function createHandler(config: RouteConfig) {
  return async (
    req: NextRequest,
    routeCtx?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();
    const ctx: RequestContext = {
      requestId,
      params: routeCtx?.params ? await routeCtx.params : undefined,
    };

    try {
      // Run middleware chain
      if (config.middleware) {
        for (const mw of config.middleware) {
          const result = await mw(req, ctx);
          if (result) return addRequestIdHeader(result, requestId);
        }
      }

      // Run handler
      const response = await config.handler(req, ctx);
      return addRequestIdHeader(response, requestId);
    } catch (error) {
      const response = errorResponse(error);
      return addRequestIdHeader(response, requestId);
    }
  };
}

function addRequestIdHeader(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('X-Request-ID', requestId);
  return response;
}
