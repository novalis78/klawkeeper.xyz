import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import dns from 'dns';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

/**
 * POST /api/user/domains/verify
 * Verify DNS records for a domain
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
    const { domainId } = await request.json();

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    // Get domain info
    const domains = await query(
      'SELECT * FROM user_domains WHERE id = ? AND user_id = ?',
      [domainId, userId]
    );

    if (domains.length === 0) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    const domain = domains[0];
    const domainName = domain.domain;

    // Check DNS records
    const results = {
      mx: false,
      spf: false,
      verification: false,
      dmarc: false
    };

    // Check MX record
    try {
      const mxRecords = await resolveMx(domainName);
      results.mx = mxRecords.some(mx =>
        mx.exchange.toLowerCase().includes('keykeeper.world')
      );
    } catch (e) {
      console.log(`[DNS Verify] MX lookup failed for ${domainName}:`, e.message);
    }

    // Check SPF record (TXT on root domain)
    try {
      const txtRecords = await resolveTxt(domainName);
      const flatRecords = txtRecords.flat();
      results.spf = flatRecords.some(txt =>
        txt.includes('include:keykeeper.world')
      );
    } catch (e) {
      console.log(`[DNS Verify] TXT lookup failed for ${domainName}:`, e.message);
    }

    // Check verification TXT record
    try {
      const verifyRecords = await resolveTxt(`_keykeeper-verify.${domainName}`);
      const flatRecords = verifyRecords.flat();
      results.verification = flatRecords.some(txt =>
        txt.includes(`keykeeper-verify=${domain.verification_token}`)
      );
    } catch (e) {
      console.log(`[DNS Verify] Verification lookup failed for ${domainName}:`, e.message);
    }

    // Check DMARC record
    try {
      const dmarcRecords = await resolveTxt(`_dmarc.${domainName}`);
      const flatRecords = dmarcRecords.flat();
      results.dmarc = flatRecords.some(txt =>
        txt.includes('v=DMARC1')
      );
    } catch (e) {
      console.log(`[DNS Verify] DMARC lookup failed for ${domainName}:`, e.message);
    }

    // Determine if domain is fully verified
    const isVerified = results.mx && results.spf && results.verification;

    // Update database
    await query(
      `UPDATE user_domains SET
        mx_verified = ?,
        spf_verified = ?,
        dmarc_verified = ?,
        verified = ?,
        verified_at = ?
       WHERE id = ?`,
      [
        results.mx,
        results.spf,
        results.dmarc,
        isVerified,
        isVerified ? new Date() : null,
        domainId
      ]
    );

    // If verified, add to virtual_domains for mail routing
    if (isVerified && !domain.verified) {
      try {
        await query(
          `INSERT IGNORE INTO virtual_domains (name) VALUES (?)`,
          [domainName]
        );
        console.log(`[DNS Verify] Added ${domainName} to virtual_domains`);
      } catch (e) {
        console.error(`[DNS Verify] Failed to add to virtual_domains:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      domain: domainName,
      verified: isVerified,
      dnsStatus: {
        mx: results.mx,
        spf: results.spf,
        dmarc: results.dmarc,
        verification: results.verification
      },
      message: isVerified
        ? 'Domain verified successfully! You can now send and receive emails.'
        : 'Some DNS records are still missing or not propagated yet.'
    });

  } catch (error) {
    console.error('[Domain Verify API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    );
  }
}
