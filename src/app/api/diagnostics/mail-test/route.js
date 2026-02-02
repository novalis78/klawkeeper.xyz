import { NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth/jwt';

/**
 * Simple test endpoint for mail sending diagnostics
 */
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Check for authentication token
    const token = extractTokenFromHeader(request);
    
    // If no token, return auth required
    if (!token) {
      console.log('No token provided to mail-test');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Try to verify token
    try {
      await verifyToken(token);
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 403 }
      );
    }
    
    // Try to parse body
    const data = await request.json().catch(err => {
      console.log('JSON parse error:', err.message);
      return { error: 'Invalid JSON' };
    });
    
    // If we got this far, it's all good
    return NextResponse.json({
      success: true,
      message: 'Test successful',
      receivedData: {
        keys: Object.keys(data),
        fromEmail: data.from?.email || 'not provided',
        toCount: Array.isArray(data.to) ? data.to.length : 'not an array'
      }
    });
  } catch (error) {
    console.error('Unexpected error in mail-test:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}