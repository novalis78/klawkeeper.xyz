import { NextResponse } from 'next/server';
import jwt from '@/lib/auth/jwt';
import pgpUtils from '@/lib/auth/pgp';
import db from '@/lib/db';

// Fix for static export by setting dynamic mode
export const dynamic = 'force-dynamic';

/**
 * Authenticate using PGP signature verification
 * 
 * The client should:
 * 1. Request a challenge from the server
 * 2. Sign it with their private key
 * 3. Send the signature, email, and challenge back to the server
 */
export async function POST(request) {
  try {
    console.log('Processing login request...');
    
    // Parse request body
    const body = await request.json();
    const { challenge, signature, email } = body;
    
    // Validate required fields
    if (!challenge || !signature || !email) {
      console.error('Missing required fields:', { 
        hasChallenge: !!challenge, 
        hasSignature: !!signature, 
        hasEmail: !!email 
      });
      
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    console.log('Login attempt for:', email);
    
    // Find the user by email to get their public key
    const user = await db.users.findByEmail(email);
    
    if (!user) {
      console.error('User not found:', email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('Found user:', {
      id: user.id,
      email: user.email,
      keyId: user.key_id,
      fingerprint: user.fingerprint
    });
    
    // Extract public key from user record
    const publicKey = user.public_key;
    
    if (!publicKey) {
      console.error('User does not have a public key:', email);
      return NextResponse.json(
        { error: 'User does not have a public key' },
        { status: 400 }
      );
    }
    
    // Verify the PGP signature against the stored public key
    console.log('Verifying signature with stored public key...');
    try {
      const isValid = await pgpUtils.verifySignature(challenge, signature, publicKey);
      
      if (!isValid) {
        console.error('Invalid signature for user:', email);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      
      console.log('Signature verified successfully for user:', email);
      
      // Generate JWT token with user information
      const token = await jwt.generateToken({
        userId: user.id,
        email: user.email,
        keyId: user.key_id,
        fingerprint: user.fingerprint
      });
      
      // Update last login timestamp
      await db.users.updateLastLogin(user.id);
      
      // Log successful login
      await db.activityLogs.create(user.id, 'login_success', {
        ipAddress: request.headers.get('x-forwarded-for') || request.ip,
        userAgent: request.headers.get('user-agent')
      });
      
      // Return the token and user info
      return NextResponse.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          keyId: user.key_id,
          fingerprint: user.fingerprint
        }
      });
    } catch (verifyError) {
      console.error('Error during signature verification:', verifyError);
      
      return NextResponse.json(
        { error: 'Signature verification error: ' + verifyError.message },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: 'Authentication failed: ' + error.message },
      { status: 500 }
    );
  }
}
