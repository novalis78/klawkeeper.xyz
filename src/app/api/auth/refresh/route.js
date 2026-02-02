import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import jwt from '@/lib/auth/jwt';
import crypto from 'crypto';

/**
 * Token refresh API endpoint
 * 
 * This endpoint refreshes an expired access token using a valid refresh token.
 */
export async function POST(request) {
  try {
    // Get refresh token from cookies
    const refreshToken = cookies().get('refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 401 }
      );
    }
    
    // Verify the refresh token
    let payload;
    try {
      payload = await jwt.verifyToken(refreshToken);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }
    
    // Check token type
    if (payload.type !== 'refresh') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 401 }
      );
    }
    
    // Retrieve user from database
    const user = await db.users.findById(payload.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }
    
    // Generate new access token
    const accessToken = await jwt.generateToken({
      userId: user.id,
      email: user.email,
      keyId: user.key_id
    });
    
    // Generate new refresh token
    const newRefreshToken = await jwt.generateToken({
      userId: user.id,
      tokenId: crypto.randomBytes(16).toString('hex')
    }, 'refresh');
    
    // Set cookies
    const cookieStore = cookies();
    
    cookieStore.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });
    
    cookieStore.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/api/auth/refresh'
    });
    
    // Log token refresh
    await db.activityLogs.create(user.id, 'token_refresh', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip
    });
    
    // Return success response with new token
    return NextResponse.json(
      { 
        success: true, 
        message: 'Token refreshed successfully',
        token: accessToken
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Token refresh error:', error);
    
    return NextResponse.json(
      { error: 'Server error during token refresh' },
      { status: 500 }
    );
  }
}