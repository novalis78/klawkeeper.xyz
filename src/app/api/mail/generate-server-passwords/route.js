import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Generate Server Passwords API (DEVELOPMENT ONLY)
 * 
 * This API endpoint is for development and debugging purposes only.
 * It directly sets a test password for mail accounts.
 */

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('[Generate Passwords API] Processing request');
  
  // Only allow this in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    // Parse request body
    const body = await request.json();
    
    // Verify required fields
    const { email, password } = body;
    
    if (!email) {
      console.error('[Generate Passwords API] Missing email field');
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // If no password is provided, generate a test one
    const testPassword = password || `test-password-${Date.now()}`;
    
    console.log(`[Generate Passwords API] Setting fixed password for: ${email}`);
    console.log(`[Generate Passwords API] Using password: ${testPassword}`);
    
    // Set to PLAIN format for this test
    const plainPassword = `{PLAIN}${testPassword}`;
    
    // Update the password in the virtual_users table
    const result = await db.query(`
      UPDATE virtual_users 
      SET 
        password = ?,
        pending_activation = 0
      WHERE email = ?
    `, [plainPassword, email]);
    
    if (!result || result.affectedRows === 0) {
      console.error(`[Generate Passwords API] User not found: ${email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`[Generate Passwords API] Successfully set password for ${email}`);
    
    // Now retrieve the password to confirm it was set correctly
    const checkResult = await db.query(`
      SELECT password
      FROM virtual_users
      WHERE email = ?
    `, [email]);
    
    if (checkResult && checkResult.length > 0) {
      const storedPassword = checkResult[0].password;
      console.log(`[Generate Passwords API] Stored password: ${storedPassword}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      email,
      testPassword
    });
  } catch (error) {
    console.error('[Generate Passwords API] Error:', error);
    return NextResponse.json({ 
      error: 'Error setting password',
      details: error.message
    }, { status: 500 });
  }
}