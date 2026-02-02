import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';

// Mark this route as dynamically rendered
export const dynamic = 'force-dynamic';

/**
 * GET handler to retrieve the user's public key
 * Requires authentication token
 */
export async function GET(request) {
  try {
    // Check for authentication token in header or cookies
    let token = extractTokenFromHeader(request);
    
    if (!token) {
      // Try to get token from cookies
      const cookieStore = cookies();
      token = extractTokenFromCookies(cookieStore);
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify JWT token
    const payload = await verifyToken(token);
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    // Get user info from database by ID
    const user = await db.users.findById(payload.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('[Public Key API] User data fields:', Object.keys(user));
    console.log('[Public Key API] Has public_key:', !!user.public_key);
    console.log('[Public Key API] Has publicKey:', !!user.publicKey);
    
    // Return the public key - handle both snake_case and camelCase field names
    return NextResponse.json({
      success: true,
      publicKey: user.public_key || user.publicKey,
      keyId: user.key_id || user.keyId,
      fingerprint: user.fingerprint
    });
    
  } catch (error) {
    console.error('Error retrieving public key:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler to retrieve a user's public key by userId
 * Requires authentication token and userId must match token
 */
export async function POST(request) {
  try {
    // Check for authentication token in header or cookies
    let token = extractTokenFromHeader(request);
    
    if (!token) {
      // Try to get token from cookies
      const cookieStore = cookies();
      token = extractTokenFromCookies(cookieStore);
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify JWT token
    const tokenPayload = await verifyToken(token);
    
    if (!tokenPayload || !tokenPayload.userId) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    // Get userId from request body
    const body = await request.json();
    const { userId } = body;
    
    // Verify the userId matches the token
    if (userId !== tokenPayload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }
    
    // Get user info from database by ID
    const user = await db.users.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('[Public Key API POST] User data fields:', Object.keys(user));
    console.log('[Public Key API POST] Has public_key:', !!user.public_key);
    console.log('[Public Key API POST] Has publicKey:', !!user.publicKey);
    
    // Return the public key - handle both snake_case and camelCase field names
    return NextResponse.json({
      success: true,
      publicKey: user.public_key || user.publicKey,
      keyId: user.key_id || user.keyId,
      fingerprint: user.fingerprint
    });
    
  } catch (error) {
    console.error('Error retrieving public key:', error);
    
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}