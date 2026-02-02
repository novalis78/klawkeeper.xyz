import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Update All Passwords API
 * 
 * This endpoint allows resetting all mail accounts to pending activation state,
 * so they will be activated with the new deterministic password algorithm.
 */

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('[Update Passwords API] Processing request');
  
  try {
    // Validate environment (only available in development)
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { email } = body;
    
    // Check if we need to update a specific user or all users
    const updateQuery = email 
      ? `UPDATE virtual_users SET pending_activation = 1 WHERE email = ?`
      : `UPDATE virtual_users SET pending_activation = 1`;
    
    const params = email ? [email] : [];
    
    // Execute the update
    console.log(`[Update Passwords API] Resetting ${email ? email : 'all accounts'} to pending activation`);
    const result = await db.query(updateQuery, params);
    
    const updatedCount = result.affectedRows || 0;
    console.log(`[Update Passwords API] Updated ${updatedCount} accounts`);
    
    // Get the list of affected accounts for logging
    const accountsQuery = email
      ? `SELECT id, email, pending_activation FROM virtual_users WHERE email = ?`
      : `SELECT id, email, pending_activation FROM virtual_users`;
    
    const accounts = await db.query(accountsQuery, email ? [email] : []);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully reset ${updatedCount} accounts to pending activation`,
      updatedCount,
      accounts: accounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        pendingActivation: acc.pending_activation === 1
      }))
    });
  } catch (error) {
    console.error('[Update Passwords API] Error:', error);
    
    return NextResponse.json(
      { error: 'Failed to update accounts', details: error.message },
      { status: 500 }
    );
  }
}