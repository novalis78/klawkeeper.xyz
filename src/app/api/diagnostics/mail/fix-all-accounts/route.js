import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Fix Mail Accounts API (DEVELOPMENT ONLY)
 * 
 * This API endpoint resets all mail accounts to a known good state.
 * It sets all accounts to pending_activation=1 so they will be activated
 * on the next login with the correct derived password.
 */

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('[Fix Accounts API] Processing request');
  
  // Only allow this in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    // Parse request body for optional filters
    const body = await request.json();
    const { email } = body;
    
    let query;
    let params = [];
    
    // If specific email is provided, only fix that account
    if (email) {
      console.log(`[Fix Accounts API] Fixing specific account: ${email}`);
      query = `
        UPDATE virtual_users 
        SET pending_activation = 1
        WHERE email = ?
      `;
      params = [email];
    } else {
      console.log(`[Fix Accounts API] Fixing all mail accounts`);
      query = `
        UPDATE virtual_users 
        SET pending_activation = 1
      `;
    }
    
    // Update accounts
    const result = await db.query(query, params);
    
    if (!result) {
      console.error(`[Fix Accounts API] Update failed`);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    
    const fixedCount = result.affectedRows || 0;
    console.log(`[Fix Accounts API] Fixed ${fixedCount} accounts`);
    
    // Get list of updated accounts
    const accounts = await db.query(`
      SELECT id, email, pending_activation
      FROM virtual_users
      ${email ? 'WHERE email = ?' : ''}
    `, email ? [email] : []);
    
    return NextResponse.json({
      success: true,
      message: `Reset ${fixedCount} accounts to pending activation`,
      fixedCount,
      accounts: accounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        pending: acc.pending_activation === 1
      }))
    });
  } catch (error) {
    console.error('[Fix Accounts API] Error:', error);
    return NextResponse.json({ 
      error: 'Error fixing accounts',
      details: error.message
    }, { status: 500 });
  }
}