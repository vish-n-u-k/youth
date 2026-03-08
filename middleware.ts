/**
 * @purpose Next.js root middleware for CORS and security headers
 * @inputs  architect_output/global_middleware_registry.json (cors order 2, helmet order 3)
 *          architect_output/global_security_policies.json (cors, securityHeaders)
 * @outputs CORS preflight responses; security headers on all API responses
 * @sideEffects None
 * @errors  None — always passes through or returns OPTIONS response
 */
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = ['Content-Type', 'X-Request-ID'];
const MAX_AGE = '86400';

function getCorsOrigin(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:5173';
}

function setCorsHeaders(response: NextResponse, origin: string): void {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  response.headers.set('Access-Control-Expose-Headers', 'X-Request-ID');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', MAX_AGE);
}

function setSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
}

export function middleware(request: NextRequest): NextResponse {
  const origin = getCorsOrigin();

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    setCorsHeaders(response, origin);
    setSecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  setCorsHeaders(response, origin);
  setSecurityHeaders(response);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
