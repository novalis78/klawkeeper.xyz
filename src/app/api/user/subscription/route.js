import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { getSubscriptionStatus, EMAIL_LIMITS } from '@/lib/subscription/checkSubscription';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/subscription
 * Returns the current user's subscription status and email limits
 */
export async function GET(request) {
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

    const status = await getSubscriptionStatus(userId);

    if (!status) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: {
        status: status.status,
        plan: status.plan,
        expiresAt: status.expiresAt,
        accountType: status.accountType
      },
      usage: {
        emailsSentToday: status.emailsSentToday,
        emailLimit: status.emailLimit,
        emailsRemaining: status.emailsRemaining
      },
      limits: EMAIL_LIMITS
    });
  } catch (error) {
    console.error('[Subscription API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
