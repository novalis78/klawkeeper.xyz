import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Direct Password Update API (DEVELOPMENT ONLY)
 * 
 * This API endpoint is for development and debugging purposes only.
 * It allows setting a direct PLAIN format password in the virtual_users table
 * to test if a specific password works with Dovecot.
 */

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('[Direct Password API] Processing request');
  
  // Only allow this in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    // Parse request body
    const body = await request.json();
    
    // Verify required fields
    const { email, password } = body;
    
    if (!email || !password) {
      console.error('[Direct Password API] Missing required fields');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    console.log(`[Direct Password API] Setting direct password for: ${email}`);
    console.log(`[Direct Password API] Using password (first 5 chars): ${password.substring(0, 5)}...`);
    
    // Set to PLAIN format for this test
    const plainPassword = `{PLAIN}${password}`;
    
    // Update the password in the virtual_users table
    const result = await db.query(`
      UPDATE virtual_users 
      SET password = ?
      WHERE email = ?
    `, [plainPassword, email]);
    
    if (!result || result.affectedRows === 0) {
      console.error(`[Direct Password API] User not found: ${email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`[Direct Password API] Successfully updated password to PLAIN format`);
    
    // Now retrieve the password to confirm it was set correctly
    const checkResult = await db.query(`
      SELECT password
      FROM virtual_users
      WHERE email = ?
    `, [email]);
    
    if (checkResult && checkResult.length > 0) {
      const storedPassword = checkResult[0].password;
      console.log(`[Direct Password API] Stored password: ${storedPassword}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password updated to PLAIN format',
      email
    });
  } catch (error) {
    console.error('[Direct Password API] Error:', error);
    return NextResponse.json({ 
      error: 'Error updating password',
      details: error.message
    }, { status: 500 });
  }
}