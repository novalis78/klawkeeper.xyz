import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import * as openpgp from 'openpgp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contacts/parse-key
 * Parse a PGP public key and extract information
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

    const { publicKey } = await request.json();

    if (!publicKey || !publicKey.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
      return NextResponse.json({ error: 'Invalid PGP key format' }, { status: 400 });
    }

    try {
      const key = await openpgp.readKey({ armoredKey: publicKey });

      // Extract user IDs
      const userIds = key.users.map(u => ({
        name: u.userID?.name || null,
        email: u.userID?.email || null,
        comment: u.userID?.comment || null
      })).filter(u => u.email);

      const primaryUser = userIds[0] || {};

      return NextResponse.json({
        success: true,
        keyId: key.getKeyID().toHex().toUpperCase(),
        fingerprint: key.getFingerprint().toUpperCase(),
        email: primaryUser.email,
        name: primaryUser.name,
        userIds,
        algorithm: key.getAlgorithmInfo().algorithm,
        bits: key.getAlgorithmInfo().bits,
        created: key.getCreationTime(),
        expires: key.getExpirationTime()
      });

    } catch (pgpError) {
      console.error('[Parse Key] PGP error:', pgpError);
      return NextResponse.json({ error: 'Failed to parse PGP key' }, { status: 400 });
    }

  } catch (error) {
    console.error('[Parse Key] Error:', error);
    return NextResponse.json({ error: 'Failed to parse key' }, { status: 500 });
  }
}
