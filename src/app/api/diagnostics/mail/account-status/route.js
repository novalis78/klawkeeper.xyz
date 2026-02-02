import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Diagnostic API to check mail account status in the database
 * 
 * This endpoint allows checking the virtual_users table for a user's mail account
 * to diagnose issues with mail account activation.
 */

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }
    
    console.log(`[Diagnostics API] Checking mail account status for: ${email}`);
    
    // Query the virtual_users table
    const result = await db.query(`
      SELECT id, email, username, password, pending_activation
      FROM virtual_users 
      WHERE email = ?
    `, [email]);
    
    if (!result || result.length === 0) {
      console.log(`[Diagnostics API] Mail account not found for: ${email}`);
      return NextResponse.json({ 
        found: false,
        message: 'Mail account not found'
      }, { status: 404 });
    }
    
    // Get the mail account data
    const account = result[0];
    
    // Mask the actual password for security, but show the format
    let passwordInfo = 'No password set';
    
    if (account.password) {
      const pwdFormat = account.password.startsWith('{') 
        ? account.password.substring(0, account.password.indexOf('}') + 1) 
        : 'unknown';
      
      const pwdLength = account.password.length;
      
      passwordInfo = `Format: ${pwdFormat}, Length: ${pwdLength}`;
    }
    
    // Return account status information
    return NextResponse.json({
      found: true,
      email: account.email,
      username: account.username,
      passwordInfo: passwordInfo,
      pendingActivation: account.pending_activation === 1,
      activated: account.pending_activation === 0,
      accountId: account.id
    });
    
  } catch (error) {
    console.error('[Diagnostics API] Error checking mail account:', error);
    
    return NextResponse.json(
      { error: 'Error checking mail account status', details: error.message },
      { status: 500 }
    );
  }
}