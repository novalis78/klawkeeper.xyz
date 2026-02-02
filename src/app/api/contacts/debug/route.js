import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    // Verify the token
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const userId = payload.userId;
    console.log('[Contacts Debug] Current user ID:', userId);

    // Get ALL public keys (for debugging)
    const allKeys = await db.query(
      `SELECT id, user_id, email, name, source, created_at FROM public_keys ORDER BY created_at DESC LIMIT 10`
    );

    // Get keys for current user
    const userKeys = await db.query(
      `SELECT id, user_id, email, name, source, created_at FROM public_keys WHERE user_id = ?`,
      [userId]
    );

    // Get keys for the email addresses associated with current user
    const userEmail = payload.email;
    const emailKeys = await db.query(
      `SELECT id, user_id, email, name, source, created_at FROM public_keys WHERE email = ?`,
      [userEmail]
    );

    return NextResponse.json({
      debug: {
        currentUserId: userId,
        currentUserEmail: userEmail,
        allKeysCount: allKeys.length,
        userKeysCount: userKeys.length,
        emailKeysCount: emailKeys.length,
        allKeys: allKeys,
        userKeys: userKeys,
        emailKeys: emailKeys
      }
    });

  } catch (error) {
    console.error('[Contacts Debug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to debug contacts', details: error.message },
      { status: 500 }
    );
  }
}