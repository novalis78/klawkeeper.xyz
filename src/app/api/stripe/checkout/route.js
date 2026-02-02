import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import Stripe from 'stripe';
import { PLANS } from '@/lib/subscription/checkSubscription';

export const dynamic = 'force-dynamic';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SK, {
  apiVersion: '2023-10-16'
});

/**
 * POST /api/stripe/checkout
 * Creates a Stripe checkout session for subscription
 */
export async function POST(request) {
  // Get token from Authorization header or cookies
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
    const userEmail = payload.email;

    const { planId } = await request.json();

    if (!planId || !PLANS[planId]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    const plan = PLANS[planId];

    // Check if user already has a Stripe customer ID
    const users = await query(
      `SELECT stripe_customer_id FROM users WHERE id = ?`,
      [userId]
    );

    let customerId = users[0]?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId
        }
      });
      customerId = customer.id;

      // Save customer ID to database
      await query(
        `UPDATE users SET stripe_customer_id = ? WHERE id = ?`,
        [customerId, userId]
      );
    }

    // Determine checkout mode based on plan
    const isOneTimePayment = plan.interval === 'once';

    // Build checkout session parameters
    const sessionParams = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: isOneTimePayment ? 'payment' : 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://keykeeper.world'}/dashboard?checkout=success&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://keykeeper.world'}/pricing?checkout=cancelled`,
      metadata: {
        userId: userId,
        planId: planId
      },
      allow_promotion_codes: true
    };

    // For subscriptions, use price lookup or create price on the fly
    if (isOneTimePayment) {
      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `KeyKeeper ${plan.name}`,
            description: plan.features.join(', ')
          },
          unit_amount: plan.price
        },
        quantity: 1
      }];
    } else {
      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `KeyKeeper ${plan.name}`,
            description: plan.features.join(', ')
          },
          unit_amount: plan.price,
          recurring: {
            interval: plan.interval
          }
        },
        quantity: 1
      }];
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('[Stripe Checkout] Session created:', session.id, 'for user:', userEmail);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}
