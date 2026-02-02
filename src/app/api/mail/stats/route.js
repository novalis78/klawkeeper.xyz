import { NextResponse } from 'next/server';
import { getMailboxStats } from '@/lib/mail/mailbox';

/**
 * API route to get mailbox statistics
 * Expects query parameter:
 * - email: the user's email address
 */

// Mark this route as dynamically rendered
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Enable real mail server integration
    process.env.USE_REAL_MAIL_SERVER = 'true';
    
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    // Basic validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }
    
    const stats = await getMailboxStats(email);
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching mailbox stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}