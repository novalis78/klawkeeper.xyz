import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt';

/**
 * Diagnostic endpoint to check authentication status
 */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Check for authentication token
    const token = extractTokenFromHeader(request);
    
    if (!token) {
      console.log('No authentication token provided');
      return NextResponse.json({
        status: 'unauthenticated',
        message: 'No authentication token provided',
        headers: Object.fromEntries([...request.headers.entries()]),
      });
    }
    
    // Verify the token
    try {
      const payload = await verifyToken(token);
      return NextResponse.json({
        status: 'authenticated',
        user: {
          email: payload.email,
          sub: payload.sub,
          exp: payload.exp
        },
        token: {
          firstChars: token.substring(0, 10) + '...',
          length: token.length
        }
      });
    } catch (error) {
      return NextResponse.json({
        status: 'invalid_token',
        error: error.message,
        token: {
          firstChars: token.substring(0, 10) + '...',
          length: token.length
        }
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message
    });
  }
}