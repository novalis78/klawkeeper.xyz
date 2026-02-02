import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import jwt from '@/lib/auth/jwt';

/**
 * Logout API endpoint
 * 
 * This endpoint invalidates the user's session and clears authentication cookies.
 */
export async function POST(request) {
  try {
    // Extract token from Authorization header or cookies
    const token = jwt.extractTokenFromHeader(request) || 
                 jwt.extractTokenFromCookies(cookies());
    
    if (token) {
      try {
        // Verify the token to get user ID
        const payload = await jwt.verifyToken(token);
        
        if (payload && payload.userId) {
          // Log the logout
          await db.activityLogs.create(payload.userId, 'logout', {
            ipAddress: request.headers.get('x-forwarded-for') || request.ip
          });
          
          // Find and invalidate session
          // This is a simplified version - in production we would use a session ID
          // stored in the cookie or token to precisely identify which session to invalidate
          const sessionToken = cookies().get('session_token')?.value;
          if (sessionToken) {
            await db.sessions.delete(sessionToken);
          }
        }
      } catch (error) {
        // Token verification failed, but we'll continue with logout
        console.error('Token verification error during logout:', error);
      }
    }
    
    // Clear cookies regardless of token validity
    const cookieStore = cookies();
    
    cookieStore.set('auth_token', '', {
      expires: new Date(0),
      path: '/'
    });
    
    cookieStore.set('refresh_token', '', {
      expires: new Date(0),
      path: '/api/auth/refresh'
    });
    
    cookieStore.set('session_token', '', {
      expires: new Date(0),
      path: '/'
    });
    
    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Logged out successfully'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, we should still attempt to clear cookies
    const cookieStore = cookies();
    
    cookieStore.set('auth_token', '', {
      expires: new Date(0),
      path: '/'
    });
    
    cookieStore.set('refresh_token', '', {
      expires: new Date(0),
      path: '/api/auth/refresh'
    });
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Logged out successfully'
      },
      { status: 200 }
    );
  }
}