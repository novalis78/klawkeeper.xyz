import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/mail/mailbox';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import { checkCanSendEmail, incrementEmailCount } from '@/lib/subscription/checkSubscription';
import passwordManager from '@/lib/users/passwordManager';
import db, { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * API route to send an email
 * Expects JSON payload with:
 * - from: sender info (name, email)
 * - to: array of recipients
 * - cc: optional array of cc recipients
 * - bcc: optional array of bcc recipients
 * - subject: email subject
 * - body: email body (HTML)
 * - attachments: optional array of attachments
 * - pgpEncrypted: optional boolean for PGP encryption
 */

// Mark this route as dynamically rendered
export const dynamic = 'force-dynamic';

// Needed to make Next.js correctly process OPTIONS requests for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function POST(request) {
  // Check for authentication token in header or cookies
  let token = extractTokenFromHeader(request);
  
  if (!token) {
    // Try to get token from cookies
    const cookieStore = cookies();
    token = extractTokenFromCookies(cookieStore);
  }
  
  if (!token) {
    console.error('No authentication token provided for mail/send API');
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  let userId;
  try {
    // Verify the token and get user data
    const payload = await verifyToken(token);
    userId = payload.userId;
    console.log('Token verified successfully. User:', payload.email || 'unknown');
  } catch (error) {
    console.error('Invalid authentication token:', error);
    return NextResponse.json(
      { error: 'Invalid authentication token' },
      { status: 403 }
    );
  }

  // Check subscription status before allowing email send
  const subscriptionCheck = await checkCanSendEmail(userId);
  if (!subscriptionCheck.canSend) {
    console.log('[Mail Send] Subscription check failed:', subscriptionCheck.reason);
    return NextResponse.json(
      {
        error: subscriptionCheck.reason,
        subscriptionStatus: subscriptionCheck.subscriptionStatus,
        emailsSent: subscriptionCheck.emailsSent,
        emailLimit: subscriptionCheck.emailLimit,
        requiresUpgrade: true
      },
      { status: 403 }
    );
  }

  console.log('[Mail Send] Subscription check passed:', {
    status: subscriptionCheck.subscriptionStatus,
    emailsRemaining: subscriptionCheck.emailsRemaining
  });

  try {
    // Enable real mail server integration
    process.env.USE_REAL_MAIL_SERVER = 'true';

    // Don't hardcode passwords - credentials will be provided by the client

    // Parse the request body
    const data = await request.json();
    
    // Basic validation
    if (!data.from || !data.to || !data.subject || !data.body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Prepare clean attachments array - preserve key attachment content
    let cleanAttachments = [];
    if (data.attachments && data.attachments.length > 0) {
      console.log(`[Mail Send API] Processing ${data.attachments.length} attachments`);
      cleanAttachments = data.attachments.map(att => {
        console.log(`[Mail Send API] Processing attachment:`, {
          filename: att.filename,
          name: att.name,
          hasContent: !!att.content,
          contentLength: att.content ? att.content.length : 0,
          contentType: att.contentType || att.type
        });
        
        const cleanAtt = {
          filename: att.filename || att.name,
          size: att.size,
          contentType: att.contentType || att.type
        };
        
        // Preserve content for all attachments that have it
        if (att.content) {
          cleanAtt.content = att.content;
          cleanAtt.encoding = att.encoding || 'base64';
          console.log(`[Mail Send API] Preserving attachment content for ${cleanAtt.filename}`);
        }
        
        // Special handling for PGP key attachments
        if (att.filename && att.filename.includes('public_key.asc')) {
          console.log(`[Mail Send API] Found public key attachment: ${att.filename}`);
          console.log(`[Mail Send API] Key content preview: ${att.content ? att.content.substring(0, 100) : 'NO CONTENT'}`);
        }
        
        return cleanAtt;
      });
    } else {
      console.log(`[Mail Send API] No attachments in request`);
    }
    
    const emailData = {
      ...data,
      attachments: cleanAttachments
    };
    
    console.log('Sending email to:', data.to.map(r => r.email).join(', '));
    console.log('Sending email from:', data.from.email);
    
    // Get user's mail credentials server-side for both SMTP send and Sent folder save
    let smtpConfig = undefined;

    // First try client-provided credentials
    if (data.credentials && data.credentials.password) {
      console.log(`Using client-provided SMTP credentials for user: ${data.from.email}`);
      smtpConfig = {
        auth: {
          user: data.from.email,
          pass: data.credentials.password
        }
      };
    } else {
      // Fall back to server-side credential lookup
      console.log(`[Mail Send] Looking up mail credentials for user ${userId}`);
      try {
        const mailAccount = await passwordManager.getPrimaryMailAccount(userId);

        if (mailAccount && mailAccount.password) {
          // Get password from virtual_users table, strip {PLAIN} prefix if present
          let mailPassword = mailAccount.password;
          if (mailPassword.startsWith('{PLAIN}')) {
            mailPassword = mailPassword.substring(7);
          }

          console.log(`[Mail Send] Found server-side credentials for ${mailAccount.email}`);
          smtpConfig = {
            auth: {
              user: mailAccount.email,
              pass: mailPassword
            }
          };
        } else {
          console.warn('[Mail Send] Could not retrieve mail credentials, Sent folder save may fail');
        }
      } catch (credError) {
        console.error('[Mail Send] Error getting mail credentials:', credError.message);
      }
    }
    
    const result = await sendEmail(emailData, {
      pgpEncrypted: data.pgpEncrypted || false,
      recipientPublicKey: data.recipientPublicKey || null,
      smtpConfig: smtpConfig
    });
    
    if (!result.success) {
      console.error('Failed to send email:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
    
    console.log('Email sent successfully, messageId:', result.messageId);

    // Increment the user's email count after successful send
    console.log('[Mail Send] About to increment email count for userId:', userId);
    const incrementResult = await incrementEmailCount(userId);
    console.log('[Mail Send] Increment email count result:', incrementResult);

    // Auto-create contacts for recipients (non-blocking)
    autoCreateContacts(userId, data.to, data.cc, data.bcc).catch(err => {
      console.error('[Mail Send] Error auto-creating contacts:', err.message);
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentAt: result.sentAt || new Date(),
      emailsRemaining: subscriptionCheck.emailsRemaining - 1
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Auto-create contacts for email recipients
 * Creates entries in public_keys for tracking who user has emailed
 */
async function autoCreateContacts(userId, to = [], cc = [], bcc = []) {
  const allRecipients = [...(to || []), ...(cc || []), ...(bcc || [])];

  for (const recipient of allRecipients) {
    const email = recipient.email?.toLowerCase();
    if (!email) continue;

    try {
      // Check if contact already exists
      const existing = await query(
        'SELECT id, last_used FROM public_keys WHERE email = ? AND user_id = ?',
        [email, userId]
      );

      if (existing.length > 0) {
        // Update last_used timestamp
        await query(
          'UPDATE public_keys SET last_used = NOW() WHERE id = ?',
          [existing[0].id]
        );
        console.log('[Auto-Contact] Updated last_used for:', email);
      } else {
        // Create new contact without PGP key (can be added later)
        const contactId = uuidv4();
        await query(
          `INSERT INTO public_keys (id, email, name, source, user_id, verified, trusted, created_at, last_used)
           VALUES (?, ?, ?, 'sent', ?, 0, 0, NOW(), NOW())`,
          [contactId, email, recipient.name || null, userId]
        );
        console.log('[Auto-Contact] Created contact from sent email:', email);
      }
    } catch (err) {
      // Don't fail if contact creation fails - it's not critical
      console.error('[Auto-Contact] Error for', email, ':', err.message);
    }
  }
}