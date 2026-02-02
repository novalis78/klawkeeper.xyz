import { NextResponse } from 'next/server';
import accountManager from '@/lib/mail/accountManager';

// For security, this endpoint should be protected in production
export const dynamic = 'force-dynamic';

/**
 * Test creating a mail account in Postfix/Dovecot
 * 
 * This endpoint is for administrative use only and tests the account
 * creation process for the mail server.
 */
export async function POST(request) {
  try {
    // Get request body
    const { email, password, host } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }
    
    console.log(`[Account Test API] Testing account creation for: ${email}`);
    
    // Parse email to extract username and domain
    const [username, domain] = email.split('@');
    
    if (!username || !domain) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 });
    }
    
    // Log what we're going to do
    console.log(`[Account Test API] Parsed email - username: ${username}, domain: ${domain}`);
    
    let result;
    let testResults = {};
    
    try {
      // Create the mail account using the accountManager
      console.log('[Account Test API] Creating test mail account');
      
      const createResult = await accountManager.createMailAccount(
        email,
        password,
        username, // Use username as display name
        1024 // 1GB quota
      );
      
      console.log('[Account Test API] Account creation result:', createResult);
      
      // Test if we can connect to the account we just created
      testResults.connectivity = await testMailboxConnectivity(email, password, host);
      
      result = {
        success: true,
        message: 'Account created successfully',
        details: {
          email,
          domain,
          output: createResult,
          tests: testResults
        }
      };
    } catch (error) {
      console.error('[Account Test API] Account creation error:', error);
      
      result = {
        success: false,
        error: 'Failed to create account',
        details: {
          message: error.message
        }
      };
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Account Test API] General error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Test if we can connect to a mailbox
 * 
 * @param {string} email Email address
 * @param {string} password Password
 * @param {string} host Host (optional)
 * @returns {Promise<Object>} Test results
 */
async function testMailboxConnectivity(email, password, host = null) {
  const results = {
    smtpTest: {
      success: false,
      error: null
    },
    imapTest: {
      success: false,
      error: null
    }
  };
  
  try {
    // Import nodemailer dynamically
    const nodemailer = (await import('nodemailer')).default;
    
    // Create and test SMTP connection
    const smtpTransporter = nodemailer.createTransport({
      host: host || process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_SMTP_PORT || '587'),
      secure: process.env.MAIL_SMTP_SECURE === 'true',
      auth: {
        user: email,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 5000 // 5 seconds timeout
    });
    
    console.log(`[Mailbox Connectivity] Testing SMTP for ${email} at ${host || process.env.MAIL_HOST || 'localhost'}`);
    
    // Verify connection
    await smtpTransporter.verify();
    
    results.smtpTest.success = true;
  } catch (error) {
    console.error('[Mailbox Connectivity] SMTP test failed:', error);
    results.smtpTest.success = false;
    results.smtpTest.error = error.message;
  }
  
  try {
    // Import imapflow dynamically
    const { ImapFlow } = await import('imapflow');
    
    // Create and test IMAP connection
    const imapClient = new ImapFlow({
      host: host || process.env.MAIL_HOST || 'localhost',
      port: parseInt(process.env.MAIL_IMAP_PORT || '993'),
      secure: process.env.MAIL_IMAP_SECURE !== 'false', // Default to true
      auth: {
        user: email,
        pass: password
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 5000 // 5 seconds timeout
    });
    
    console.log(`[Mailbox Connectivity] Testing IMAP for ${email} at ${host || process.env.MAIL_HOST || 'localhost'}`);
    
    // Test connection
    await imapClient.connect();
    console.log(`[Mailbox Connectivity] IMAP connected, capabilities:`, imapClient.capability);
    
    // Try to list mailboxes
    try {
      const mailboxes = await imapClient.list();
      console.log(`[Mailbox Connectivity] Found ${mailboxes.length} mailboxes`);
      results.imapTest.mailboxes = mailboxes.map(box => box.path);
    } catch (listError) {
      console.warn('[Mailbox Connectivity] Could not list mailboxes:', listError.message);
    }
    
    await imapClient.logout();
    results.imapTest.success = true;
  } catch (error) {
    console.error('[Mailbox Connectivity] IMAP test failed:', error);
    results.imapTest.success = false;
    results.imapTest.error = error.message;
  }
  
  return results;
}