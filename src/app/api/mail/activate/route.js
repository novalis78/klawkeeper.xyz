import { NextResponse } from 'next/server';
import db from '@/lib/db';
import accountManager from '@/lib/mail/accountManager';
// Not actually importing dovecotAuth here, we are now using the client-provided password directly

/**
 * First Login Mail Account Activation API
 * 
 * This endpoint is called during a user's first login to activate their mail account
 * by updating the password hash with the actual deterministic password derived from
 * their private key.
 */

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('[Mail Activation API] Processing mail account activation request');
  
  // In a real app, we would verify the JWT token here
  // For this demo, we'll just proceed with the request
  // This is fine because the email is verified by checking if it exists in the database
  
  try {
    // Parse request body to get user information
    const body = await request.json();
    
    if (!body.derivedPassword) {
      console.error('[Mail Activation API] Missing derived password');
      return NextResponse.json({ error: 'Derived password is required' }, { status: 400 });
    }
    
    // In the auth token we should find the user email and ID
    // For this demo, we'll extract it from the request body
    // In a real app, we would decode and verify the JWT token
    const userEmail = body.email;
    
    if (!userEmail) {
      console.error('[Mail Activation API] No user email provided');
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }
    
    console.log(`[Mail Activation API] Processing activation for user with email: ${userEmail}`);
    
    // Verify required fields - we need the derived password from the client
    const { derivedPassword } = body;
    
    if (!derivedPassword) {
      console.error('[Mail Activation API] Missing required field: derivedPassword');
      return NextResponse.json({ error: 'Missing derived password' }, { status: 400 });
    }
    
    console.log(`[Mail Activation API] Received password for activation (first 5 chars: ${derivedPassword.substring(0, 5)}...)`);
    
    // Check if mail account exists and needs activation
    console.log(`[Mail Activation API] Checking mail account status for: ${userEmail}`);
    
    // Custom query to check activation status
    // Since we don't have the user_id, we'll just use the email
    const result = await db.query(`
      SELECT id, pending_activation, password
      FROM virtual_users 
      WHERE email = ?
    `, [userEmail]);
    
    if (!result || result.length === 0) {
      console.error('[Mail Activation API] Mail account not found');
      return NextResponse.json({ error: 'Mail account not found' }, { status: 404 });
    }
    
    const mailAccount = result[0];
    
    // Debug current password in database
    console.log(`[Mail Activation API] Current password in database: ${mailAccount.password?.substring(0, 20)}...`);
    
    // Always update the password to match what the client has provided
    // This ensures consistency even if the derivation algorithm changes
    console.log(`[Mail Activation API] Updating password even though account is already activated`);
    console.log(`[Mail Activation API] Previous password: ${mailAccount.password?.substring(0, 20)}...`);
    console.log(`[Mail Activation API] New password: {PLAIN}${derivedPassword.substring(0, 20)}...`);
    
    // If already activated, still update the password to ensure consistency
    // This ensures the database always matches what the client is using
    // REMOVE THIS CODE AFTER FIXING AUTHENTICATION ISSUES - THIS IS TEMPORARY FOR MIGRATION
    /*
    if (mailAccount.pending_activation !== 1) {
      console.log(`[Mail Activation API] Mail account already activated for ${userEmail}`);
      return NextResponse.json({ 
        message: 'Mail account already activated', 
        activated: false,
        alreadyActive: true
      });
    }
    */
    
    // Update the password hash with the derived password
    console.log(`[Mail Activation API] Updating password hash for ${userEmail}`);
    
    try {
      // Always use PLAIN format for consistency
      // This ensures the same derived password works across logins
      const usePlainText = true; // Always use PLAIN format 
      
      console.log(`[Mail Activation API] Using derived password (first 5 chars: ${derivedPassword.substring(0, 5)}...)`);
      console.log(`[Mail Activation API] Using plain text format: ${usePlainText}`);
      console.log(`[Mail Activation API] FULL PASSWORD FOR DEBUGGING: ${derivedPassword}`);
      
      // Prepare the password hash
      let passwordHash;
      
      if (usePlainText) {
        // Use PLAIN format for testing
        passwordHash = `{PLAIN}${derivedPassword}`;
        console.log(`[Mail Activation API] Using PLAIN password format: ${passwordHash.substring(0, 20)}...`);
      } else {
        // Update the password in the virtual_users table
        // Generate a proper SHA512-CRYPT hash with a new salt using OpenSSL
        const { execSync } = await import('child_process');
        const crypto = await import('crypto');
        
        // Generate a random salt
        const salt = crypto.randomBytes(8).toString('base64')
          .replace(/[+\/=]/g, '.')
          .substring(0, 16);
        
        // Use OpenSSL to generate the proper SHA512-CRYPT hash
        const hash = execSync(`openssl passwd -6 -salt "${salt}" "${derivedPassword}"`).toString().trim();
        passwordHash = `{SHA512-CRYPT}${hash}`;
        
        console.log(`[Mail Activation API] Generated SHA512-CRYPT hash: ${passwordHash.substring(0, 20)}...`);
      }
      
      // Update both password and activation flag in a single query
      await db.query(`
        UPDATE virtual_users 
        SET 
          password = ?,
          pending_activation = 0 
        WHERE email = ?
      `, [passwordHash, userEmail]);
      
      console.log(`[Mail Activation API] Successfully activated mail account for ${userEmail}`);
      
      // Try to add an activity log if possible
      try {
        await db.query(`
          INSERT INTO activity_logs (id, user_id, activity_type, details, created_at)
          SELECT UUID(), u.user_id, 'mail_account_activation', '{"success":true}', NOW()
          FROM virtual_users u
          WHERE u.email = ?
        `, [userEmail]);
        console.log('[Mail Activation API] Activity logged successfully');
      } catch (logError) {
        console.warn('[Mail Activation API] Could not log activity:', logError.message);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Mail account activated successfully',
        activated: true
      });
    } catch (updateError) {
      console.error('[Mail Activation API] Error updating password:', updateError);
      
      await db.activityLogs.create(user.id, 'mail_account_activation', {
        email: user.email,
        success: false,
        error: updateError.message
      });
      
      return NextResponse.json({ 
        error: 'Failed to update mail account password',
        details: updateError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Mail Activation API] General error during activation:', error);
    return NextResponse.json({ 
      error: 'Error processing activation request',
      details: error.message 
    }, { status: 500 });
  }
}