import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import validation from '@/lib/utils/validation';
import { generateToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * Generate password reset token and send email
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;
    
    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
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
    
    // Find user by email
    const user = await db.users.findByEmail(email);
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { 
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        },
        { status: 200 }
      );
    }
    
    // Check if this is a password-based account
    if (!user.password_hash) {
      return NextResponse.json(
        { 
          error: 'This account uses a different authentication method. Please contact support for assistance.'
        },
        { status: 400 }
      );
    }
    
    // Generate reset token (valid for 1 hour)
    const resetToken = await generateToken({
      userId: user.id,
      email: user.email,
      type: 'password_reset'
    });
    
    // Store reset token in database (you might want to add a password_resets table)
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // For now, store in activity logs - in production, use a dedicated password_resets table
    await db.activityLogs.create(user.id, 'password_reset_requested', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      details: {
        token: tokenId,
        expiresAt: expiresAt.toISOString()
      }
    });
    
    // TODO: Send actual email with reset link
    // For now, return the token for development/testing
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://keykeeper.world'}/reset-password?token=${resetToken}&id=${user.id}`;
    
    console.log(`Password reset requested for ${email}`);
    console.log(`Reset link: ${resetLink}`);
    
    // In production, you would send an email like:
    // await emailService.sendPasswordReset(email, resetLink);
    
    return NextResponse.json(
      { 
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.',
        // For development only - remove in production
        ...(process.env.NODE_ENV === 'development' && { 
          resetLink,
          resetToken 
        })
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Server error during password reset request: ' + error.message },
      { status: 500 }
    );
  }
}