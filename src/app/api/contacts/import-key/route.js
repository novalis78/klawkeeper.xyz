import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import * as openpgp from 'openpgp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contacts/import-key
 * Import a key from keyserver search results
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
    const { keyId, email, name, publicKey } = await request.json();

    if (!publicKey || !email) {
      return NextResponse.json({ error: 'Public key and email are required' }, { status: 400 });
    }

    // Parse and verify the key
    let parsedKeyId, fingerprint;
    try {
      const key = await openpgp.readKey({ armoredKey: publicKey });
      parsedKeyId = key.getKeyID().toHex().toUpperCase();
      fingerprint = key.getFingerprint().toUpperCase();
    } catch (pgpError) {
      return NextResponse.json({ error: 'Invalid PGP key' }, { status: 400 });
    }

    // Check if this key already exists
    const existing = await db.query(
      'SELECT id FROM public_keys WHERE key_id = ? OR (email = ? AND user_id = ?)',
      [parsedKeyId, email.toLowerCase(), userId]
    );

    if (existing.length > 0) {
      // Update existing entry
      await db.query(
        `UPDATE public_keys SET
          public_key = ?,
          fingerprint = ?,
          name = COALESCE(?, name),
          source = 'keyserver',
          updated_at = NOW()
         WHERE id = ?`,
        [publicKey, fingerprint, name, existing[0].id]
      );

      console.log('[Import Key] Updated existing key for:', email);

      return NextResponse.json({
        success: true,
        updated: true,
        contact: {
          id: existing[0].id,
          email,
          name,
          key_id: parsedKeyId
        }
      });
    }

    // Create new contact
    const contactId = uuidv4();

    await db.query(
      `INSERT INTO public_keys (id, email, name, public_key, key_id, fingerprint, source, user_id, verified, trusted, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'keyserver', ?, 1, 0, NOW())`,
      [contactId, email.toLowerCase(), name || null, publicKey, parsedKeyId, fingerprint, userId]
    );

    console.log('[Import Key] Imported key from keyserver:', email, parsedKeyId);

    return NextResponse.json({
      success: true,
      contact: {
        id: contactId,
        email: email.toLowerCase(),
        name,
        key_id: parsedKeyId,
        fingerprint,
        source: 'keyserver'
      }
    });

  } catch (error) {
    console.error('[Import Key] Error:', error);
    return NextResponse.json({ error: 'Failed to import key' }, { status: 500 });
  }
}
