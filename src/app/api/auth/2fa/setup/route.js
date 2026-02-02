import { NextResponse } from 'next/server';
import * as OTPAuth from 'otpauth';
import jwt from '@/lib/auth/jwt';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Setup 2FA (TOTP) for a user account
 */
export async function POST(request) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await jwt.verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.users.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: 'KeyKeeper.world',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });

    // Get the secret
    const secret = totp.secret.base32;

    // Generate backup codes (one-time use)
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(totp.generate());
    }

    // Generate QR code URI with image parameter (supported by some authenticators)
    let otpauthUrl = totp.toString();
    // Add image parameter for authenticators that support it (unofficial but widely supported)
    const iconUrl = 'https://keykeeper.world/logo.png';
    otpauthUrl += `&image=${encodeURIComponent(iconUrl)}`;
    
    // Store the secret in database (not enabled yet)
    await db.users.updateTOTPSecret(user.id, secret);
    
    // Log 2FA setup initiated
    await db.activityLogs.create(user.id, '2fa_setup_initiated', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      details: { 
        method: 'totp_setup',
        backupCodesGenerated: 10
      }
    });
    
    return NextResponse.json({
      success: true,
      secret,
      qrCodeUrl: otpauthUrl,
      backupCodes,
      instructions: {
        step1: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)',
        step2: 'Or manually enter this secret in your app: ' + secret,
        step3: 'Enter the 6-digit code from your app below to enable 2FA',
        step4: 'Save your backup codes in a secure location. Each code can only be used once.',
        apps: ['Google Authenticator', 'Authy', '1Password', 'Microsoft Authenticator', 'LastPass Authenticator']
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA: ' + error.message },
      { status: 500 }
    );
  }
}
