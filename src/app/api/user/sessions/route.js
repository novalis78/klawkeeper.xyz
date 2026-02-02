import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies, headers } from 'next/headers';
import { query } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Parse user agent to extract device info
function parseUserAgent(ua) {
  if (!ua) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };

  let device = 'Desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect device type
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  // Detect browser
  if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  // Detect OS
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

// Get geolocation from IP using ipstack
async function getGeoLocation(ip) {
  // Skip for localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', city: 'Local Network', region: null, latitude: null, longitude: null };
  }

  const apiKey = process.env.IPSTACK_API_KEY;
  if (!apiKey) {
    console.log('[Sessions] IPSTACK_API_KEY not configured');
    return { country: null, city: null, region: null, latitude: null, longitude: null };
  }

  try {
    const response = await fetch(`http://api.ipstack.com/${ip}?access_key=${apiKey}&format=1`);
    const data = await response.json();

    if (data.success === false) {
      console.error('[Sessions] ipstack error:', data.error);
      return { country: null, city: null, region: null, latitude: null, longitude: null };
    }

    return {
      country: data.country_name || null,
      city: data.city || null,
      region: data.region_name || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null
    };
  } catch (error) {
    console.error('[Sessions] Geolocation error:', error);
    return { country: null, city: null, region: null, latitude: null, longitude: null };
  }
}

// Hash token for storage (don't store raw tokens)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex').substring(0, 64);
}

/**
 * GET /api/user/sessions
 * Get all active sessions for the current user
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
    const currentTokenHash = hashToken(token);

    // Get all sessions for this user
    const sessions = await query(
      `SELECT id, ip_address, user_agent, device_type, browser, os,
              country, city, region, created_at, last_active_at,
              (token_hash = ?) as is_current
       FROM user_sessions
       WHERE user_id = ?
       ORDER BY last_active_at DESC`,
      [currentTokenHash, userId]
    );

    // Format sessions for response
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      ipAddress: session.ip_address,
      device: session.device_type || 'Unknown',
      browser: session.browser || 'Unknown',
      os: session.os || 'Unknown',
      location: session.city && session.country
        ? `${session.city}, ${session.country}`
        : session.country || 'Unknown location',
      createdAt: session.created_at,
      lastActive: session.last_active_at,
      isCurrent: session.is_current === 1
    }));

    return NextResponse.json({ sessions: formattedSessions });

  } catch (error) {
    console.error('[Sessions] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

/**
 * POST /api/user/sessions
 * Create or update a session (called on login/page load)
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
    const tokenHash = hashToken(token);

    // Get request headers
    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';

    // Get IP address (check various headers for proxied requests)
    let ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || headersList.get('cf-connecting-ip')
      || 'Unknown';

    // Parse user agent
    const { device, browser, os } = parseUserAgent(userAgent);

    // Check if session already exists
    const existing = await query(
      `SELECT id FROM user_sessions WHERE token_hash = ?`,
      [tokenHash]
    );

    if (existing.length > 0) {
      // Update last active time
      await query(
        `UPDATE user_sessions SET last_active_at = NOW() WHERE token_hash = ?`,
        [tokenHash]
      );
      return NextResponse.json({ success: true, action: 'updated' });
    }

    // Get geolocation for new session
    const geo = await getGeoLocation(ipAddress);

    // Create new session
    const { v4: uuidv4 } = await import('uuid');
    const sessionId = uuidv4();

    await query(
      `INSERT INTO user_sessions
       (id, user_id, token_hash, ip_address, user_agent, device_type, browser, os,
        country, city, region, latitude, longitude, created_at, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [sessionId, userId, tokenHash, ipAddress, userAgent, device, browser, os,
       geo.country, geo.city, geo.region, geo.latitude, geo.longitude]
    );

    console.log(`[Sessions] Created new session for user ${userId} from ${ipAddress} (${geo.city}, ${geo.country})`);

    return NextResponse.json({
      success: true,
      action: 'created',
      session: {
        id: sessionId,
        device,
        browser,
        os,
        location: geo.city && geo.country ? `${geo.city}, ${geo.country}` : 'Unknown'
      }
    });

  } catch (error) {
    console.error('[Sessions] Create error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/sessions
 * Revoke session(s)
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
    const currentTokenHash = hashToken(token);

    const { sessionId, revokeAll } = await request.json();

    if (revokeAll) {
      // Revoke all sessions except current
      const result = await query(
        `DELETE FROM user_sessions WHERE user_id = ? AND token_hash != ?`,
        [userId, currentTokenHash]
      );
      console.log(`[Sessions] Revoked all other sessions for user ${userId}`);
      return NextResponse.json({ success: true, revoked: result.affectedRows });
    } else if (sessionId) {
      // Revoke specific session (but not current)
      const result = await query(
        `DELETE FROM user_sessions WHERE id = ? AND user_id = ? AND token_hash != ?`,
        [sessionId, userId, currentTokenHash]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Session not found or is current session' }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Session ID or revokeAll required' }, { status: 400 });
    }

  } catch (error) {
    console.error('[Sessions] Delete error:', error);
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
