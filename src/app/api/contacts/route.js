import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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
    console.log('[Contacts API] Fetching contacts for user:', userId);

    // Fetch contacts with public keys for this user
    // Also include keys that haven't been assigned to any user yet (user_id IS NULL)
    const contacts = await db.query(
      `SELECT 
        id,
        email,
        name,
        key_id,
        fingerprint,
        source,
        verified,
        trusted,
        created_at,
        last_used
      FROM public_keys 
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY last_used DESC, created_at DESC`,
      [userId]
    );

    console.log('[Contacts API] Found contacts:', contacts.length);
    if (contacts.length > 0) {
      console.log('[Contacts API] First contact:', contacts[0]);
    }

    return NextResponse.json({
      contacts: contacts,
      total: contacts.length
    });

  } catch (error) {
    console.error('[Contacts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}