import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Check Agent Credit Balance
 */
export async function GET(request) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);

    // Find user by API key
    const user = await db.users.findByApiKey(apiKey);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Check if this is an agent account
    if (user.account_type !== 'agent') {
      return NextResponse.json(
        { error: 'This endpoint is only for agent accounts' },
        { status: 403 }
      );
    }

    // Return balance information
    return NextResponse.json({
      credits: parseFloat(user.credits || 0),
      email: user.email,
      accountStatus: user.status
    });
  } catch (error) {
    console.error('Balance check error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve balance: ' + error.message },
      { status: 500 }
    );
  }
}
