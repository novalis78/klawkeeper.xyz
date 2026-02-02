import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cloudflare/connect
 * Connect/save Cloudflare API token
 */
export async function POST(request) {
  let token = extractTokenFromHeader(request);
  if (!token) {
    const cookieStore = cookies();
    token = extractTokenFromCookies(cookieStore);
  }

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    const userId = payload.userId;

    // Check subscription status
    const users = await query(
      `SELECT subscription_status FROM users WHERE id = ?`,
      [userId]
    );

    if (!users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check subscription - only paid users can use Cloudflare integration
    if (!['active', 'trial'].includes(users[0].subscription_status)) {
      return NextResponse.json({
        error: 'Cloudflare integration requires a paid subscription',
        requiresUpgrade: true
      }, { status: 403 });
    }

    const { apiToken } = await request.json();

    if (!apiToken) {
      return NextResponse.json({ error: 'API token is required' }, { status: 400 });
    }

    // Verify the token works by fetching user details
    const verifyResponse = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      return NextResponse.json({
        error: 'Invalid Cloudflare API token',
        details: verifyData.errors
      }, { status: 400 });
    }

    // Save the token
    await query(
      `UPDATE users SET cloudflare_api_token = ? WHERE id = ?`,
      [apiToken, userId]
    );

    console.log('[Cloudflare] Token connected for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Cloudflare connected successfully'
    });

  } catch (error) {
    console.error('[Cloudflare Connect] Error:', error);
    return NextResponse.json({ error: 'Failed to connect Cloudflare' }, { status: 500 });
  }
}

/**
 * DELETE /api/cloudflare/connect
 * Disconnect Cloudflare
 */
export async function DELETE(request) {
  let token = extractTokenFromHeader(request);
  if (!token) {
    const cookieStore = cookies();
    token = extractTokenFromCookies(cookieStore);
  }

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    const userId = payload.userId;

    await query(
      `UPDATE users SET cloudflare_api_token = NULL WHERE id = ?`,
      [userId]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Cloudflare Disconnect] Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
