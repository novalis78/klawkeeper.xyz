import { NextResponse } from 'next/server';

/**
 * Simple ping endpoint that doesn't require database access
 */
export async function GET(request) {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
}