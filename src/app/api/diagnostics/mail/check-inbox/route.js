import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';

/**
 * Mail Inbox Diagnostic Tool
 * 
 * This API endpoint checks if mail can be received and read from the inbox
 * for a given user account, providing detailed diagnostics.
 */

export const dynamic = 'force-dynamic';

export async function POST(request) {
  console.log('[Inbox Check API] Starting inbox check diagnostic');
  
  try {
    // Parse request body
    const body = await request.json();
    
    // Verify required fields
    const { email, password, server, port, secure } = body;
    
    if (!email || !password) {
      console.error('[Inbox Check API] Missing required fields');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    // Default values for server settings if not provided
    const imapServer = server || process.env.MAIL_HOST || 'mail.keykeeper.world';
    const imapPort = port || parseInt(process.env.MAIL_IMAP_PORT || '993');
    const imapSecure = secure !== undefined ? secure : process.env.MAIL_IMAP_SECURE !== 'false';
    
    console.log(`[Inbox Check API] Checking inbox for: ${email}`);
    console.log(`[Inbox Check API] Using server: ${imapServer}:${imapPort} (secure: ${imapSecure ? 'YES' : 'NO'})`);
    
    // Create IMAP client
    const client = new ImapFlow({
      host: imapServer,
      port: imapPort,
      secure: imapSecure,
      auth: {
        user: email,
        pass: password
      },
      logger: false,
      tls: {
        // Allow self-signed certificates
        rejectUnauthorized: false
      }
    });
    
    // Check IMAP connection
    console.log(`[Inbox Check API] Attempting to connect to IMAP server...`);
    try {
      await client.connect();
      console.log(`[Inbox Check API] ✅ Successfully connected to IMAP server`);
    } catch (connectError) {
      console.error(`[Inbox Check API] ❌ Failed to connect to IMAP:`, connectError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'IMAP connection failed', 
        details: connectError.message,
        step: 'connection'
      }, { status: 500 });
    }
    
    // Check mailboxes
    try {
      console.log(`[Inbox Check API] Listing available mailboxes...`);
      const mailboxes = await client.listMailboxes();
      console.log(`[Inbox Check API] Found ${mailboxes.children?.length || 0} mailboxes`);
      
      // Check if INBOX exists
      const hasInbox = mailboxes.children?.some(box => box.name === 'INBOX');
      if (!hasInbox) {
        console.warn(`[Inbox Check API] No INBOX found!`);
      } else {
        console.log(`[Inbox Check API] ✅ INBOX mailbox found`);
      }
    } catch (listError) {
      console.error(`[Inbox Check API] ❌ Failed to list mailboxes:`, listError.message);
      await client.logout();
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to list mailboxes', 
        details: listError.message,
        step: 'list_mailboxes'
      }, { status: 500 });
    }
    
    // Open INBOX
    try {
      console.log(`[Inbox Check API] Opening INBOX...`);
      const mailbox = await client.mailboxOpen('INBOX');
      console.log(`[Inbox Check API] ✅ INBOX opened with ${mailbox.exists} messages`);
      
      // Check message count
      if (mailbox.exists === 0) {
        console.log(`[Inbox Check API] INBOX is empty (0 messages)`);
      } else {
        console.log(`[Inbox Check API] INBOX contains ${mailbox.exists} messages`);
        
        // List the most recent messages
        const count = Math.min(5, mailbox.exists);
        console.log(`[Inbox Check API] Listing most recent ${count} message(s)...`);
        
        const startSeq = Math.max(1, mailbox.exists - count + 1);
        const endSeq = mailbox.exists;
        
        const messageList = [];
        
        for await (const message of client.fetch(`${startSeq}:${endSeq}`, { envelope: true })) {
          messageList.push({
            id: message.uid,
            subject: message.envelope.subject || '(No Subject)',
            from: message.envelope.from?.[0]?.address || 'unknown',
            date: message.envelope.date?.toISOString() || 'unknown'
          });
        }
        
        console.log(`[Inbox Check API] Found ${messageList.length} message(s) in INBOX`);
        
        if (messageList.length > 0) {
          console.log(`[Inbox Check API] Message details:`, messageList);
        }
      }
    } catch (inboxError) {
      console.error(`[Inbox Check API] ❌ Failed to open INBOX:`, inboxError.message);
      await client.logout();
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to open INBOX', 
        details: inboxError.message,
        step: 'open_inbox'
      }, { status: 500 });
    }
    
    // Logout
    await client.logout();
    console.log(`[Inbox Check API] Successfully disconnected from IMAP server`);
    
    return NextResponse.json({
      success: true,
      message: 'Inbox check completed successfully',
      results: {
        connection: true,
        authentication: true
      }
    });
  } catch (error) {
    console.error('[Inbox Check API] Error during inbox check:', error);
    return NextResponse.json({ 
      error: 'Error checking inbox', 
      details: error.message 
    }, { status: 500 });
  }
}