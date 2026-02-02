import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { EMAIL_LIMITS } from '@/lib/subscription/checkSubscription';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/stats
 * Get analytics data for the authenticated user
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

    // Get user data including subscription status
    const users = await query(
      `SELECT
        email,
        subscription_status,
        subscription_plan,
        emails_sent_today,
        emails_sent_reset_at,
        created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!users.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Reset daily email count if it's a new day
    const today = new Date().toISOString().split('T')[0];
    let emailsSentToday = user.emails_sent_today || 0;
    if (user.emails_sent_reset_at !== today) {
      emailsSentToday = 0;
    }

    // Get email limit based on subscription status
    const emailLimit = EMAIL_LIMITS[user.subscription_status] || EMAIL_LIMITS.free;

    // Count contacts
    let contactsCount = 0;
    try {
      const contacts = await query(
        `SELECT COUNT(*) as count FROM contacts WHERE user_id = ?`,
        [userId]
      );
      contactsCount = contacts[0]?.count || 0;
    } catch (e) {
      // contacts table might not exist
    }

    // Count public keys
    let publicKeysCount = 0;
    try {
      const keys = await query(
        `SELECT COUNT(*) as count FROM public_keys WHERE user_id = ?`,
        [userId]
      );
      publicKeysCount = keys[0]?.count || 0;
    } catch (e) {
      // public_keys table might not exist
    }

    // Count email addresses
    let addressesActive = 1;
    try {
      const addresses = await query(
        `SELECT COUNT(*) as count FROM user_domains WHERE user_id = ? AND status = 'verified'`,
        [userId]
      );
      addressesActive = Math.max(1, addresses[0]?.count || 0);
    } catch (e) {
      // user_domains table might not exist
    }

    // Get total emails sent (from activity log or estimated)
    let totalEmailsSent = 0;
    try {
      const sentEmails = await query(
        `SELECT COUNT(*) as count FROM activity_logs
         WHERE user_id = ? AND activity_type = 'email_sent'`,
        [userId]
      );
      totalEmailsSent = sentEmails[0]?.count || 0;
    } catch (e) {
      // Estimate from daily sent count
      totalEmailsSent = emailsSentToday;
    }

    // Calculate days since registration
    const daysActive = Math.ceil(
      (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)
    );

    // Estimate total received (this would need IMAP access for real data)
    const totalEmailsReceived = 0; // Would need to query IMAP

    return NextResponse.json({
      emailsSentToday,
      emailLimit,
      emailsRemaining: Math.max(0, emailLimit - emailsSentToday),
      totalEmailsSent,
      totalEmailsReceived,
      contactsCount,
      publicKeysCount,
      addressesActive,
      addressesExpired: 0,
      emailsReceived: 0,
      emailsForwarded: 0,
      emailsEncrypted: 0,
      averageResponseTime: 45, // Static for now
      daysActive,
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan
    });

  } catch (error) {
    console.error('[Analytics Stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
