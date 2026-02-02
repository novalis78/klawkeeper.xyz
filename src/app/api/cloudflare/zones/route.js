import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cloudflare/zones
 * List user's Cloudflare zones (domains)
 */
export async function GET(request) {
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

    // Check if user has Cloudflare credentials stored
    const users = await query(
      `SELECT cloudflare_api_token, subscription_status FROM users WHERE id = ?`,
      [userId]
    );

    if (!users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Check subscription - only paid users can use Cloudflare integration
    if (!['active', 'trial'].includes(user.subscription_status)) {
      return NextResponse.json({
        error: 'Cloudflare integration requires a paid subscription',
        requiresUpgrade: true
      }, { status: 403 });
    }

    if (!user.cloudflare_api_token) {
      return NextResponse.json({
        connected: false,
        zones: []
      });
    }

    // Fetch zones from Cloudflare
    const cfResponse = await fetch('https://api.cloudflare.com/client/v4/zones', {
      headers: {
        'Authorization': `Bearer ${user.cloudflare_api_token}`,
        'Content-Type': 'application/json'
      }
    });

    const cfData = await cfResponse.json();

    if (!cfData.success) {
      return NextResponse.json({
        error: 'Failed to fetch Cloudflare zones',
        details: cfData.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      connected: true,
      zones: cfData.result.map(zone => ({
        id: zone.id,
        name: zone.name,
        status: zone.status
      }))
    });

  } catch (error) {
    console.error('[Cloudflare Zones] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}
