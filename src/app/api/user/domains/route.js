import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/domains
 * Returns all custom domains for the current user
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

    const domains = await query(
      `SELECT
        id, domain as name, verified, verification_token,
        mx_verified, spf_verified, dkim_verified, dmarc_verified,
        created_at, verified_at
       FROM user_domains
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      domains: domains.map(d => ({
        id: d.id,
        name: d.name,
        verified: d.verified,
        verificationToken: d.verification_token,
        dnsStatus: {
          mx: d.mx_verified,
          spf: d.spf_verified,
          dkim: d.dkim_verified,
          dmarc: d.dmarc_verified
        },
        createdAt: d.created_at,
        verifiedAt: d.verified_at
      }))
    });
  } catch (error) {
    console.error('[Domains API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/domains
 * Add a new custom domain
 */
export async function POST(request) {
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
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    const cleanDomain = domain.toLowerCase().trim();

    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // Check if domain already exists
    const existing = await query(
      'SELECT id FROM user_domains WHERE domain = ?',
      [cleanDomain]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'This domain is already registered' },
        { status: 409 }
      );
    }

    // Generate verification token
    const domainId = uuidv4();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await query(
      `INSERT INTO user_domains (id, user_id, domain, verification_token)
       VALUES (?, ?, ?, ?)`,
      [domainId, userId, cleanDomain, verificationToken]
    );

    // Return the new domain with DNS setup instructions
    return NextResponse.json({
      success: true,
      domain: {
        id: domainId,
        name: cleanDomain,
        verified: false,
        verificationToken,
        dnsStatus: {
          mx: false,
          spf: false,
          dkim: false,
          dmarc: false
        }
      },
      dnsRecords: getDNSRecords(cleanDomain, verificationToken)
    });

  } catch (error) {
    console.error('[Domains API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add domain' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/domains
 * Remove a custom domain
 */
export async function DELETE(request) {
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
    const { domainId } = await request.json();

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const domain = await query(
      'SELECT id FROM user_domains WHERE id = ? AND user_id = ?',
      [domainId, userId]
    );

    if (domain.length === 0) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    await query('DELETE FROM user_domains WHERE id = ?', [domainId]);

    return NextResponse.json({
      success: true,
      message: 'Domain removed successfully'
    });

  } catch (error) {
    console.error('[Domains API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete domain' },
      { status: 500 }
    );
  }
}

/**
 * Generate DNS records for a domain
 */
function getDNSRecords(domain, verificationToken) {
  return [
    {
      type: 'MX',
      name: '@',
      value: 'mail.keykeeper.world',
      priority: 10,
      description: 'Mail server record'
    },
    {
      type: 'TXT',
      name: '@',
      value: `v=spf1 include:keykeeper.world ~all`,
      description: 'SPF record for email authentication'
    },
    {
      type: 'TXT',
      name: '_dmarc',
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@keykeeper.world`,
      description: 'DMARC policy'
    },
    {
      type: 'TXT',
      name: '_keykeeper-verify',
      value: `keykeeper-verify=${verificationToken}`,
      description: 'Domain verification record'
    },
    {
      type: 'CNAME',
      name: 'mail',
      value: 'mail.keykeeper.world',
      description: 'Mail subdomain'
    }
  ];
}
