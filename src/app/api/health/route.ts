import { NextResponse } from 'next/server';

// GET /api/health
export function GET(): NextResponse {
  return NextResponse.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    },
  });
}
