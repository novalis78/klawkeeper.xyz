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

    // Get the public key for this email address
    const keys = await db.query(
      `SELECT id, public_key, key_id, fingerprint, verified 
       FROM public_keys 
       WHERE (user_id = ? OR user_id IS NULL) AND email = ? 
       ORDER BY verified DESC, last_used DESC 
       LIMIT 1`,
      [userId, email]
    );

    if (keys.length === 0) {
      return NextResponse.json({ 
        publicKey: null,
        message: 'No public key found for this email'
      });
    }

    // Update last_used timestamp
    await db.query(
      `UPDATE public_keys SET last_used = NOW() WHERE id = ?`,
      [keys[0].id]
    );

    return NextResponse.json({
      publicKey: keys[0].public_key,
      keyId: keys[0].key_id,
      fingerprint: keys[0].fingerprint,
      verified: keys[0].verified
    });

  } catch (error) {
    console.error('[Get Key API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve public key' },
      { status: 500 }
    );
  }
}