import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import validation from '@/lib/utils/validation';
import jwt from '@/lib/auth/jwt';
import crypto from 'crypto';
import pgpUtils from '@/lib/auth/pgp';

// Fix for static export by setting dynamic mode
export const dynamic = 'force-dynamic';

/**
 * PGP signature verification API endpoint
 * 
 * This endpoint verifies a PGP signature against a previously generated challenge
 * and issues a JWT token upon successful verification.
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Extract required fields
    const { email, challenge, signature } = body;
    
    // Validate required fields
    if (!email || !challenge || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    if (!validation.isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }
    
    // Validate signature format
    if (!validation.isValidSignature(signature)) {
      return NextResponse.json(
        { error: 'Invalid PGP signature format' },
        { status: 400 }
      );
    }
    
    // Find user by email
    const user = await db.users.findByEmail(email);
    
    // If user doesn't exist, return authentication error
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Verify that the challenge exists for the user
    const isValidChallenge = await db.challenges.verify(challenge, user.id);
    
    if (!isValidChallenge) {
      return NextResponse.json(
        { error: 'Invalid or expired challenge' },
        { status: 401 }
      );
    }
    
    // Verify the signature using the user's public key
    console.log('Verifying signature with user public key...');
    let signatureVerified = false;
    
    try {
      // Use pgpUtils to verify the signature against the user's public key
      signatureVerified = await pgpUtils.verifySignature(challenge, signature, user.public_key);
      console.log('Signature verification result:', signatureVerified);
      
      if (!signatureVerified) {
        console.error('Signature verification failed for user:', user.email);
        console.log('Challenge:', challenge);
        console.log('Signature format valid:', validation.isValidSignature(signature));
        
        return NextResponse.json(
          { error: 'Signature verification failed - invalid signature for this public key' },
          { status: 401 }
        );
      }
    } catch (verifyError) {
      console.error('Error during signature verification:', verifyError);
      
      return NextResponse.json(
        { error: 'Signature verification error: ' + verifyError.message },
        { status: 401 }
      );
    }
    
    // Update last login timestamp
    await db.users.updateLastLogin(user.id);
    
    // Generate token - include fingerprint for mail credential derivation
    const accessToken = await jwt.generateToken({
      userId: user.id,
      email: user.email,
      keyId: user.key_id,
      fingerprint: user.fingerprint
    });
    
    // Generate refresh token
    const refreshToken = await jwt.generateToken({
      userId: user.id,
      tokenId: crypto.randomBytes(16).toString('hex')
    }, 'refresh');
    
    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await db.sessions.create(user.id, sessionToken, {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent')
    });
    
    // Set cookies
    const cookieStore = cookies();
    cookieStore.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });
    
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/api/auth/refresh'
    });
    
    // Log successful authentication
    await db.activityLogs.create(user.id, 'authentication_success', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      details: {
        method: 'pgp_signature'
      }
    });
    
    // Return success response with token
    return NextResponse.json(
      { 
        success: true, 
        message: 'Authentication successful',
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          keyId: user.key_id,
          fingerprint: user.fingerprint
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    return NextResponse.json(
      { error: 'Server error during authentication' },
      { status: 500 }
    );
  }
}

/**
 * Verify a JWT token is valid
 */
export async function GET(request) {
  try {
    // Extract token from Authorization header or cookies
    const token = jwt.extractTokenFromHeader(request) || 
                 jwt.extractTokenFromCookies(cookies());
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }
    
    // Verify the token
    const payload = await jwt.verifyToken(token);
    
    // Get full user info, including fingerprint
    let userInfo = {
      userId: payload.userId,
      email: payload.email,
      keyId: payload.keyId,
    };
    
    // If fingerprint isn't in token, try to get it from the database
    if (!payload.fingerprint && payload.userId) {
      try {
        const user = await db.users.findById(payload.userId);
        if (user && user.fingerprint) {
          userInfo.fingerprint = user.fingerprint;
        }
      } catch (dbError) {
        console.warn('Error fetching user fingerprint:', dbError);
        // Continue without fingerprint
      }
    } else if (payload.fingerprint) {
      userInfo.fingerprint = payload.fingerprint;
    }
    
    // Return the decoded payload (without sensitive info)
    return NextResponse.json({
      authenticated: true,
      user: userInfo,
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Invalid or expired token'
      },
      { status: 401 }
    );
  }
}

// This function has been replaced with direct OpenPGP.js signature verification
