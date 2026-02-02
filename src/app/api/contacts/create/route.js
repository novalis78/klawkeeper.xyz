import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import * as openpgp from 'openpgp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contacts/create
 * Create a new contact with optional PGP key
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;
    const { email, name, publicKey, source = 'manual' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if contact already exists
    const existing = await db.query(
      'SELECT id FROM public_keys WHERE email = ? AND (user_id = ? OR user_id IS NULL)',
      [email.toLowerCase(), userId]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Contact with this email already exists' }, { status: 409 });
    }

    let keyId = null;
    let fingerprint = null;

    // Parse PGP key if provided
    if (publicKey && publicKey.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
      try {
        const key = await openpgp.readKey({ armoredKey: publicKey });
        keyId = key.getKeyID().toHex().toUpperCase();
        fingerprint = key.getFingerprint().toUpperCase();
      } catch (pgpError) {
        console.error('[Contacts] Error parsing PGP key:', pgpError);
        return NextResponse.json({ error: 'Invalid PGP public key format' }, { status: 400 });
      }
    }

    const contactId = uuidv4();

    await db.query(
      `INSERT INTO public_keys (id, email, name, public_key, key_id, fingerprint, source, user_id, verified, trusted, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())`,
      [contactId, email.toLowerCase(), name || null, publicKey || null, keyId, fingerprint, source, userId]
    );

    console.log('[Contacts] Created contact:', email, 'for user:', userId);

    return NextResponse.json({
      success: true,
      contact: {
        id: contactId,
        email: email.toLowerCase(),
        name,
        key_id: keyId,
        fingerprint,
        source
      }
    });

  } catch (error) {
    console.error('[Contacts Create] Error:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
