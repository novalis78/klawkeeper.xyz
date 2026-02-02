import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// KeyKeeper mail server IP
const MAIL_SERVER_IP = '107.170.27.222';

/**
 * POST /api/cloudflare/setup-dns
 * Automatically configure DNS records for email on a Cloudflare zone
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

    // Get user's Cloudflare token
    const users = await query(
      `SELECT cloudflare_api_token, subscription_status FROM users WHERE id = ?`,
      [userId]
    );

    if (!users.length || !users[0].cloudflare_api_token) {
      return NextResponse.json({ error: 'Cloudflare not connected' }, { status: 400 });
    }

    if (!['active', 'trial'].includes(users[0].subscription_status)) {
      return NextResponse.json({
        error: 'Cloudflare integration requires a paid subscription',
        requiresUpgrade: true
      }, { status: 403 });
    }

    const cfToken = users[0].cloudflare_api_token;
    const { zoneId, domain } = await request.json();

    if (!zoneId || !domain) {
      return NextResponse.json({ error: 'Zone ID and domain are required' }, { status: 400 });
    }

    const results = {
      created: [],
      errors: [],
      skipped: []
    };

    // DNS records to create
    const dnsRecords = [
      // MX record for receiving email
      {
        type: 'MX',
        name: domain,
        content: `mail.${domain}`,
        priority: 10,
        proxied: false
      },
      // A record for mail subdomain
      {
        type: 'A',
        name: `mail.${domain}`,
        content: MAIL_SERVER_IP,
        proxied: false
      },
      // SPF record
      {
        type: 'TXT',
        name: domain,
        content: `v=spf1 mx a ip4:${MAIL_SERVER_IP} ~all`
      },
      // DMARC record
      {
        type: 'TXT',
        name: `_dmarc.${domain}`,
        content: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@keykeeper.world'
      }
    ];

    // Create each DNS record
    for (const record of dnsRecords) {
      try {
        // Check if record already exists
        const existingResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=${record.type}&name=${record.name}`,
          {
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const existingData = await existingResponse.json();

        if (existingData.result && existingData.result.length > 0) {
          // Record exists - update it
          const existingRecord = existingData.result[0];

          // For TXT records, check if our specific content exists
          if (record.type === 'TXT') {
            const hasOurRecord = existingData.result.some(r => r.content === record.content);
            if (hasOurRecord) {
              results.skipped.push({ ...record, reason: 'Already exists' });
              continue;
            }
          } else {
            // Update existing record
            const updateResponse = await fetch(
              `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existingRecord.id}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${cfToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  type: record.type,
                  name: record.name,
                  content: record.content,
                  priority: record.priority,
                  proxied: record.proxied || false
                })
              }
            );

            const updateData = await updateResponse.json();

            if (updateData.success) {
              results.created.push({ ...record, action: 'updated' });
            } else {
              results.errors.push({ ...record, error: updateData.errors });
            }
            continue;
          }
        }

        // Create new record
        const createResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: record.type,
              name: record.name,
              content: record.content,
              priority: record.priority,
              proxied: record.proxied || false
            })
          }
        );

        const createData = await createResponse.json();

        if (createData.success) {
          results.created.push({ ...record, action: 'created' });
        } else {
          results.errors.push({ ...record, error: createData.errors });
        }

      } catch (recordError) {
        results.errors.push({ ...record, error: recordError.message });
      }
    }

    // Save domain to user_domains if not exists
    const existingDomain = await query(
      `SELECT id FROM user_domains WHERE user_id = ? AND domain = ?`,
      [userId, domain]
    );

    if (existingDomain.length === 0) {
      const { v4: uuidv4 } = await import('uuid');
      await query(
        `INSERT INTO user_domains (id, user_id, domain, status, cloudflare_zone_id, created_at)
         VALUES (?, ?, ?, 'verified', ?, NOW())`,
        [uuidv4(), userId, domain, zoneId]
      );
    } else {
      await query(
        `UPDATE user_domains SET status = 'verified', cloudflare_zone_id = ? WHERE user_id = ? AND domain = ?`,
        [zoneId, userId, domain]
      );
    }

    console.log('[Cloudflare DNS] Setup complete for', domain, ':', results);

    return NextResponse.json({
      success: true,
      domain,
      results
    });

  } catch (error) {
    console.error('[Cloudflare DNS Setup] Error:', error);
    return NextResponse.json({ error: 'Failed to setup DNS' }, { status: 500 });
  }
}
