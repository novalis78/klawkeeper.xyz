import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import jwt from '@/lib/auth/jwt';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Simplified login for humans using email/password + optional 2FA
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, totpCode } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.users.findByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if this is a password-based account
    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'This account uses a different authentication method' },
        { status: 400 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      // Log failed login attempt
      await db.activityLogs.create(user.id, 'login_failed', {
        ipAddress: request.headers.get('x-forwarded-for') || request.ip,
        reason: 'invalid_password'
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.totp_enabled) {
      if (!totpCode) {
        return NextResponse.json(
          {
            error: '2FA code required',
            requires2FA: true
          },
          { status: 403 }
        );
      }

      // Verify TOTP code
      try {
        const totp = new OTPAuth.TOTP({
          secret: user.totp_secret,
          digits: 6,
          period: 30
        });

        const isValid = totp.validate({ token: totpCode, window: 1 }) !== null;

        if (!isValid) {
          await db.activityLogs.create(user.id, 'login_failed', {
            ipAddress: request.headers.get('x-forwarded-for') || request.ip,
            reason: 'invalid_2fa'
          });

          return NextResponse.json(
            { error: 'Invalid 2FA code' },
            { status: 401 }
          );
        }
      } catch (totpError) {
        console.error('2FA verification error:', totpError);
        return NextResponse.json(
          { error: '2FA verification failed' },
          { status: 500 }
        );
      }
    }

    // Generate JWT token
    const token = await jwt.generateToken({
      userId: user.id,
      email: user.email,
      accountType: user.account_type || 'human'
    });

    // Update last login timestamp
    await db.users.updateLastLogin(user.id);

    // Log successful login
    await db.activityLogs.create(user.id, 'login_success', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      userAgent: request.headers.get('user-agent')
    });

    // Return token and user info
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        accountType: user.account_type || 'human',
        totpEnabled: user.totp_enabled || false,
        credits: user.credits || 0
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed: ' + error.message },
      { status: 500 }
    );
  }
}
