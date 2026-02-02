import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/profile
 * Returns the current user's profile information
 */
export async function GET(request) {
  let token = extractTokenFromHeader(request);

  if (!token) {
    const cookieStore = cookies();
    token = extractTokenFromCookies(cookieStore);
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const payload = await verifyToken(token);
    const userId = payload.userId;

    const users = await query(
      `SELECT
        id, email, name, public_key, key_id, fingerprint,
        created_at, last_login, status, account_type,
        totp_enabled
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        publicKey: user.public_key,
        keyId: user.key_id,
        fingerprint: user.fingerprint,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        status: user.status,
        accountType: user.account_type,
        totpEnabled: user.totp_enabled,
        hasPgpKeys: !!(user.public_key && user.key_id)
      }
    });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile information
 */
export async function PATCH(request) {
  let token = extractTokenFromHeader(request);

  if (!token) {
    const cookieStore = cookies();
    token = extractTokenFromCookies(cookieStore);
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const payload = await verifyToken(token);
    const userId = payload.userId;
    const updates = await request.json();

    // Only allow updating certain fields
    const allowedFields = ['name'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateValues.push(userId);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
