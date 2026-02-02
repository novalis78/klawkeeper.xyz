import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if we have a public key for this email address
    const keys = await db.query(
      `SELECT id, key_id, verified FROM public_keys 
       WHERE (user_id = ? OR user_id IS NULL) AND email = ? 
       LIMIT 1`,
      [userId, email]
    );

    return NextResponse.json({
      hasKey: keys.length > 0,
      keyId: keys[0]?.key_id || null,
      verified: keys[0]?.verified || false
    });

  } catch (error) {
    console.error('[Check Key API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check key status' },
      { status: 500 }
    );
  }
}