import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SK, {
  apiVersion: '2023-10-16'
});

// Webhook secret for verifying signatures
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription management
 */
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 400 }
        );
      }
    } else {
      // In development, parse without verification (not recommended for production)
      console.warn('[Stripe Webhook] No webhook secret configured, parsing without verification');
      event = JSON.parse(body);
    }

    console.log('[Stripe Webhook] Received event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(session) {
  console.log('[Stripe] Checkout completed:', session.id);

  const customerId = session.customer;
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId) {
    console.error('[Stripe] No userId in session metadata');
    return;
  }

  // Update user with Stripe customer ID
  await query(
    `UPDATE users SET stripe_customer_id = ? WHERE id = ?`,
    [customerId, userId]
  );

  // If this is a one-time payment (Bitcoin plan), set subscription directly
  if (session.mode === 'payment' && planId === 'bitcoin') {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 36); // 3 years

    await query(
      `UPDATE users SET
        subscription_status = 'active',
        subscription_plan = 'bitcoin',
        subscription_expires_at = ?
       WHERE id = ?`,
      [expiresAt, userId]
    );

    console.log('[Stripe] Bitcoin plan activated for user:', userId);
  }
}

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionUpdate(subscription) {
  console.log('[Stripe] Subscription update:', subscription.id, subscription.status);

  const customerId = subscription.customer;

  // Find user by Stripe customer ID
  const users = await query(
    `SELECT id FROM users WHERE stripe_customer_id = ?`,
    [customerId]
  );

  if (users.length === 0) {
    console.error('[Stripe] No user found for customer:', customerId);
    return;
  }

  const userId = users[0].id;

  // Map Stripe status to our status
  let subscriptionStatus = 'free';
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    subscriptionStatus = 'active';
  } else if (subscription.status === 'canceled') {
    subscriptionStatus = 'cancelled';
  } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    subscriptionStatus = 'expired';
  }

  // Get plan from subscription items
  const planId = subscription.items?.data[0]?.price?.lookup_key || 'personal';

  // Calculate expiration from current period end
  const expiresAt = new Date(subscription.current_period_end * 1000);

  await query(
    `UPDATE users SET
      subscription_status = ?,
      subscription_plan = ?,
      subscription_expires_at = ?
     WHERE id = ?`,
    [subscriptionStatus, planId, expiresAt, userId]
  );

  console.log('[Stripe] User subscription updated:', userId, subscriptionStatus, planId);
}

/**
 * Handle subscription cancelled event
 */
async function handleSubscriptionCancelled(subscription) {
  console.log('[Stripe] Subscription cancelled:', subscription.id);

  const customerId = subscription.customer;

  // Find user by Stripe customer ID
  const users = await query(
    `SELECT id FROM users WHERE stripe_customer_id = ?`,
    [customerId]
  );

  if (users.length === 0) {
    console.error('[Stripe] No user found for customer:', customerId);
    return;
  }

  const userId = users[0].id;

  // Set to cancelled - they keep access until period ends
  await query(
    `UPDATE users SET subscription_status = 'cancelled' WHERE id = ?`,
    [userId]
  );

  console.log('[Stripe] User subscription cancelled:', userId);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  console.log('[Stripe] Payment succeeded for invoice:', invoice.id);
  // Subscription update event will handle the status change
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  console.log('[Stripe] Payment failed for invoice:', invoice.id);

  const customerId = invoice.customer;

  // Find user by Stripe customer ID
  const users = await query(
    `SELECT id, email FROM users WHERE stripe_customer_id = ?`,
    [customerId]
  );

  if (users.length === 0) {
    return;
  }

  const user = users[0];

  // Log the failed payment
  console.warn('[Stripe] Payment failed for user:', user.email);

  // Could send an email notification here
  // await sendPaymentFailedEmail(user.email);
}
