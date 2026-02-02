import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * Disable 2FA for a user
 */
export async function POST(request) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await jwt.verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
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

    if (!user.totp_enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Disable 2FA
    await db.users.disableTOTP(user.id);

    // Log 2FA disabled
    await db.activityLogs.create(user.id, '2fa_disabled', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      details: { method: 'user_request' }
    });

    return NextResponse.json(
      {
        success: true,
        message: '2FA has been disabled for your account'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Server error during 2FA disable: ' + error.message },
      { status: 500 }
    );
  }
}