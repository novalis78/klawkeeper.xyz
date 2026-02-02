import { NextResponse } from 'next/server';
import { PLANS, EMAIL_LIMITS } from '@/lib/subscription/checkSubscription';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stripe/plans
 * Returns available subscription plans (public endpoint)
 */
export async function GET() {
  // Convert PLANS object to array and add display info
  const plans = Object.values(PLANS).map(plan => ({
    ...plan,
    // Don't expose internal price in cents, show display price
    price: undefined,
    priceAmount: plan.price / 100,
    currency: 'USD'
  }));

  return NextResponse.json({
    success: true,
    plans,
    limits: EMAIL_LIMITS
  });
}
