import { NextResponse } from 'next/server';
import db from '@/lib/db';
import validation from '@/lib/utils/validation';
import crypto from 'crypto';

/**
 * Generate authentication challenge API endpoint
 * 
 * This endpoint receives a user's email and generates a random challenge
 * to be signed with their private key for authentication.
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Extract email
    const { email } = body;
    
    // Validate email
    if (!email || !validation.isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    // Find user by email
    const user = await db.users.findByEmail(email);
    
    // If user doesn't exist, still return a fake challenge for security
    // This prevents enumeration attacks
    if (!user) {
      const fakeChallenge = generateChallenge();
      
      return NextResponse.json(
        { 
          challenge: fakeChallenge,
          message: 'Challenge generated'
        },
        { status: 200 }
      );
    }
    
    // Clean up expired challenges for this user
    await db.challenges.cleanupExpired();
    
    // Generate a random challenge
    const challenge = generateChallenge();
    
    // Store the challenge in the database
    await db.challenges.create(user.id, challenge, 10); // Expires in 10 minutes
    
    // Log authentication attempt
    await db.activityLogs.create(user.id, 'authentication_challenge', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip
    });
    
    // Return the challenge
    return NextResponse.json(
      { 
        challenge,
        message: 'Challenge generated'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Challenge generation error:', error);
    
    return NextResponse.json(
      { error: 'Server error during challenge generation' },
      { status: 500 }
    );
  }
}

/**
 * Generate a random challenge string
 * @returns {string} - Random challenge string
 */
function generateChallenge() {
  // Generate a random buffer of 32 bytes
  const randomBytes = crypto.randomBytes(32);
  
  // Create a challenge with a timestamp to prevent replay attacks
  const timestamp = new Date().toISOString();
  const challengeData = `keykeeper-auth-${timestamp}-${randomBytes.toString('hex')}`;
  
  return challengeData;
}