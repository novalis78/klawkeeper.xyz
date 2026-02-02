/**
 * Subscription check utilities
 *
 * This module provides functions to check if a user has an active subscription
 * and can send emails based on their plan limits.
 */

import { query } from '@/lib/db';

// Email limits per subscription tier
const EMAIL_LIMITS = {
  free: 3,        // 3 emails per day for free users (enough to try, not enough to abuse)
  trial: 50,      // 50 emails per day during trial period
  active: 500,    // 500 emails per day for paid subscribers
  cancelled: 3,   // Same as free when cancelled
  expired: 3      // Same as free when expired
};

// Plan details for display and Stripe integration
const PLANS = {
  personal: {
    id: 'personal',
    name: 'Personal',
    price: 299, // cents
    priceDisplay: '$2.99',
    interval: 'month',
    emailLimit: 100,
    features: [
      '100 emails per day',
      '1GB storage',
      'Full PGP encryption',
      'No branding in emails',
      'Priority support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 699, // cents
    priceDisplay: '$6.99',
    interval: 'month',
    emailLimit: 500,
    features: [
      '500 emails per day',
      '5GB storage',
      'Full PGP encryption',
      'No branding in emails',
      'API access',
      'Priority support'
    ]
  },
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin 3-Year',
    price: 3000, // cents (one-time)
    priceDisplay: '$30',
    interval: 'once',
    duration: 36, // months
    emailLimit: 500,
    features: [
      '500 emails per day for 3 years',
      '5GB storage',
      'Full PGP encryption',
      'No branding in emails',
      'Maximum privacy',
      'No recurring charges'
    ]
  }
};

/**
 * Check if a user can send emails based on their subscription status
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Result with canSend, reason, and subscription details
 */
export async function checkCanSendEmail(userId) {
  try {
    // Get user's subscription status and email counts
    const users = await query(
      `SELECT
        subscription_status,
        subscription_plan,
        subscription_expires_at,
        emails_sent_today,
        emails_sent_reset_at,
        account_type
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return {
        canSend: false,
        reason: 'User not found',
        subscriptionStatus: null
      };
    }

    const user = users[0];

    // AI agents use credits system, not subscription
    if (user.account_type === 'agent') {
      return {
        canSend: true,
        reason: 'Agent accounts use credits',
        subscriptionStatus: 'agent',
        accountType: 'agent'
      };
    }

    // Check if subscription has expired
    const now = new Date();
    if (user.subscription_expires_at && new Date(user.subscription_expires_at) < now) {
      // Update status to expired if it hasn't been updated
      if (user.subscription_status === 'active') {
        await query(
          `UPDATE users SET subscription_status = 'expired' WHERE id = ?`,
          [userId]
        );
        user.subscription_status = 'expired';
      }
    }

    // Reset daily email count if it's a new day
    const today = new Date().toISOString().split('T')[0];
    if (user.emails_sent_reset_at !== today) {
      await query(
        `UPDATE users SET emails_sent_today = 0, emails_sent_reset_at = ? WHERE id = ?`,
        [today, userId]
      );
      user.emails_sent_today = 0;
    }

    // Get the email limit for this subscription status
    const emailLimit = EMAIL_LIMITS[user.subscription_status] || EMAIL_LIMITS.free;
    const emailsSent = user.emails_sent_today || 0;

    // Check if user has exceeded their daily limit
    if (emailsSent >= emailLimit) {
      return {
        canSend: false,
        reason: `Daily email limit reached (${emailLimit} emails). Upgrade your plan for more.`,
        subscriptionStatus: user.subscription_status,
        emailsSent,
        emailLimit,
        accountType: user.account_type
      };
    }

    return {
      canSend: true,
      reason: 'OK',
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan,
      emailsSent,
      emailLimit,
      emailsRemaining: emailLimit - emailsSent,
      accountType: user.account_type
    };

  } catch (error) {
    console.error('[Subscription Check] Error:', error);
    // In case of error, allow sending but log the issue
    return {
      canSend: true,
      reason: 'Subscription check failed, allowing send',
      error: error.message
    };
  }
}

/**
 * Increment the email sent count for a user
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - Success status
 */
export async function incrementEmailCount(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    console.log('[Subscription] Incrementing email count for user:', userId, 'date:', today);

    const result = await query(
      `UPDATE users SET
        emails_sent_today = emails_sent_today + 1,
        emails_sent_reset_at = COALESCE(emails_sent_reset_at, ?)
       WHERE id = ?`,
      [today, userId]
    );

    console.log('[Subscription] Increment result:', { affectedRows: result?.affectedRows, userId });

    if (!result || result.affectedRows === 0) {
      console.error('[Subscription] Increment failed - no rows affected for user:', userId);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Subscription] Failed to increment email count:', error);
    console.error('[Subscription] Error details:', { userId, message: error.message, code: error.code });
    return false;
  }
}

/**
 * Get user's subscription status summary
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Subscription summary
 */
export async function getSubscriptionStatus(userId) {
  try {
    const users = await query(
      `SELECT
        subscription_status,
        subscription_plan,
        subscription_expires_at,
        emails_sent_today,
        account_type,
        credits
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    const emailLimit = EMAIL_LIMITS[user.subscription_status] || EMAIL_LIMITS.free;

    return {
      status: user.subscription_status,
      plan: user.subscription_plan,
      expiresAt: user.subscription_expires_at,
      emailsSentToday: user.emails_sent_today || 0,
      emailLimit,
      emailsRemaining: Math.max(0, emailLimit - (user.emails_sent_today || 0)),
      accountType: user.account_type,
      credits: user.account_type === 'agent' ? user.credits : null
    };
  } catch (error) {
    console.error('[Subscription Status] Error:', error);
    return null;
  }
}

// Named exports for direct imports
export { EMAIL_LIMITS, PLANS };

export default {
  checkCanSendEmail,
  incrementEmailCount,
  getSubscriptionStatus,
  EMAIL_LIMITS,
  PLANS
};
