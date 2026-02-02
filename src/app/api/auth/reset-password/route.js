import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from '@/lib/auth/jwt';
import db from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Reset password using token
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, userId, password } = body;
    
    // Validate required fields
    if (!token || !userId || !password) {
      return NextResponse.json(
        { error: 'Token, user ID, and password are required' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Verify JWT token
    let tokenData;
    try {
      tokenData = await jwt.verifyToken(token);
    } catch (tokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }
    
    // Verify token matches user
    if (tokenData.userId !== userId || tokenData.type !== 'password_reset') {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 401 }
      );
    }
    
    // Find user
    const user = await db.users.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Update user password
    await db.users.update(userId, {
      password_hash: passwordHash
    });
    
    // Log password reset
    await db.activityLogs.create(userId, 'password_reset_completed', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      details: { method: 'token_reset' }
    });
    
    // Derive new mail password from updated hash
    const { deriveMailPasswordFromHash } = await import('@/lib/auth/serverPgp');
    let mailPassword;
    try {
      mailPassword = await deriveMailPasswordFromHash(user.email, passwordHash);
      
      // Update mail password
      await db.users.updateMailPassword(userId, mailPassword);
      console.log(`Updated mail password for ${user.email}`);
    } catch (deriveError) {
      console.error('Failed to derive new mail password:', deriveError);
      // Non-fatal - password reset still succeeded
    }
    
    return NextResponse.json(
      {
        success: true,
        message: 'Password has been successfully reset',
        mailPasswordUpdated: !!mailPassword
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Server error during password reset: ' + error.message },
      { status: 500 }
    );
  }
}