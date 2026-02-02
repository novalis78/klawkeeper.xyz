import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import db from '@/lib/db';
import passwordManager from '@/lib/users/passwordManager';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * Fetches emails from the user's inbox via IMAP
 * 
 * @param {Request} request The incoming request object
 * @returns {Promise<NextResponse>} JSON response with inbox messages
 */
export async function POST(request) {
  // Reference for client that needs to be closed in finally block
  let client = null;
  
  try {
    // Check for authentication token in header or cookies
    let token = extractTokenFromHeader(request);
    
    if (!token) {
      // Try to get token from cookies
      const cookieStore = cookies();
      token = extractTokenFromCookies(cookieStore);
    }
    
    if (!token) {
      console.error('[Mail API] No authentication token provided');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify the token and get user data
    let tokenPayload;
    try {
      tokenPayload = await verifyToken(token);
      console.log('[Mail API] Token verified for user:', tokenPayload.email);
    } catch (error) {
      console.error('[Mail API] Invalid authentication token:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 403 }
      );
    }
    
    // Get user info and credentials from the request
    const body = await request.json();
    const { userId, credentials } = body;
    
    // Verify the userId matches the token
    if (userId !== tokenPayload.userId) {
      console.error('[Mail API] User ID mismatch - token userId:', tokenPayload.userId, 'request userId:', userId);
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }
    
    console.log(`[Mail API] Got request for user ID: ${userId}`);
    console.log(`[Mail API] Credentials provided: ${credentials ? 'YES' : 'NO'}`);
    
    if (credentials) {
      // Log credential info without exposing the password
      const credInfo = {
        email: credentials.email,
        hasPassword: !!credentials.password,
        server: credentials.imapServer,
        port: credentials.imapPort,
        secure: credentials.imapSecure
      };
      console.log(`[Mail API] Credential details:`, credInfo);
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get user details from the database
    const user = await db.users.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if credentials are provided directly
    if (!credentials || !credentials.email || !credentials.password) {
      console.log(`[Mail API] No credentials provided for user ${userId}, checking mail account status...`);
      
      // If no credentials provided, check if user has any mail accounts
      const hasMailAccount = await passwordManager.hasMailAccount(userId);
      if (!hasMailAccount) {
        console.log(`[Mail API] User ${userId} does not have a mail account in virtual_users table`);
        return NextResponse.json(
          { error: 'User does not have a mail account' },
          { status: 404 }
        );
      }
      
      console.log(`[Mail API] User ${userId} has a mail account, retrieving details...`);
      
      // Get the primary mail account for the user
      const mailAccount = await passwordManager.getPrimaryMailAccount(userId);
      if (!mailAccount) {
        console.log(`[Mail API] Could not retrieve mail account info for user ${userId}`);
        return NextResponse.json(
          { error: 'Could not retrieve mail account information' },
          { status: 500 }
        );
      }
      
      console.log(`[Mail API] Found mail account: ${mailAccount.email} for user ${userId}`);
      console.log(`[Mail API] Need client-side derived password - returning 401 with account info`);
      
      // Client must provide deterministically derived password
      // This is part of the passwordless approach where the password
      // is derived from the private key on the client side
      return NextResponse.json(
        { 
          error: 'Mail credentials required',
          requireCredentials: true,
          mailAccount: {
            email: mailAccount.email,
            username: mailAccount.username,
            server: process.env.MAIL_HOST || 'mail.keykeeper.world',
            port: parseInt(process.env.MAIL_IMAP_PORT || '993'),
            secure: process.env.MAIL_IMAP_SECURE !== 'false'
          },
          authInfo: {
            saltValue: process.env.DOVECOT_AUTH_SALT || 'keykeeper-dovecot-auth',
            version: process.env.DOVECOT_AUTH_VERSION || 'v1'
          }
        },
        { status: 401 }
      );
    }
    
    console.log(`[Mail API] Credentials provided for mail access: ${credentials.email}`);
    
    // Determine which credentials to use
    let mailAddress;
    let mailPass;
    let imapHost;
    let imapPort;
    let imapSecure;
    
    if (credentials) {
      // Use provided credentials
      mailAddress = credentials.email;
      mailPass = credentials.password;
      imapHost = credentials.imapServer || process.env.MAIL_HOST || 'localhost';
      imapPort = credentials.imapPort || parseInt(process.env.MAIL_IMAP_PORT || '993');
      imapSecure = credentials.imapSecure !== undefined ? credentials.imapSecure : process.env.MAIL_IMAP_SECURE !== 'false';
      
      // Log credential info for debugging (mask password)
      console.log(`[Mail API] Using user-provided credentials for ${mailAddress}`);
      console.log(`[Mail API] Password provided: ${mailPass ? 'YES (length: ' + mailPass.length + ', first chars: ' + mailPass.substring(0, 3) + '...)' : 'NO'}`);
      console.log(`[Mail API] IMAP server: ${imapHost}:${imapPort} (secure: ${imapSecure ? 'YES' : 'NO'})`);
    } else {
      // This branch shouldn't be reached due to the check above, but keeping it for safety
      return NextResponse.json(
        { error: 'Mail credentials required', requireCredentials: true },
        { status: 401 }
      );
    }
    
    // Set up IMAP client
    console.log(`[Mail API] Setting up IMAP client with rejectUnauthorized: ${process.env.NODE_ENV === 'production'}`);
    
    client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: imapSecure,
      auth: {
        user: mailAddress,
        pass: mailPass
      },
      logger: false,
      tls: {
        // Allow self-signed certificates in development
        rejectUnauthorized: false // Set to false for development to allow self-signed certs
      },
      // Ensure we examine both new and cur directories in Maildir format
      mailbox: {
        readOnly: false, // Allow message status changes
        listenOnlyNewEmails: false // Check both new and cur directories
      }
    });
    
    // Connect to the server
    try {
      console.log(`[Mail API] Attempting to connect to IMAP server ${imapHost}:${imapPort} for ${mailAddress}...`);
      console.log(`[Mail API] Using secure connection: ${imapSecure ? 'YES' : 'NO'}`);
      console.log(`[Mail API] Using rejectUnauthorized: ${process.env.NODE_ENV === 'production'}`);
      console.log(`[Mail API] Password length: ${mailPass?.length || 0}, first chars: ${mailPass ? mailPass.substring(0, 3) : 'none'}...`);
      
      try {
        await client.connect();
        console.log(`[Mail API] ✅ Successfully connected to IMAP server for ${mailAddress}`);
      } catch (innerError) {
        console.error(`[Mail API] ❌ IMAP connection inner error:`, innerError);
        console.error(`[Mail API] Error code:`, innerError.code);
        console.error(`[Mail API] Error name:`, innerError.name);
        console.error(`[Mail API] Error response:`, innerError.response);
        console.error(`[Mail API] Error details:`, JSON.stringify(innerError, Object.getOwnPropertyNames(innerError)));
        throw innerError;
      }
    } catch (connectError) {
      console.error(`[Mail API] ❌ IMAP connection error for ${mailAddress}:`, connectError.message);
      console.error(`[Mail API] Error details:`, JSON.stringify(connectError, Object.getOwnPropertyNames(connectError)));
      
      // Return a more detailed error response
      return NextResponse.json(
        { 
          error: 'Error fetching inbox', 
          details: connectError.message,
          authFailed: connectError.authenticationFailed || false,
          responseText: connectError.responseText || null,
          serverResponseCode: connectError.serverResponseCode || null
        },
        { status: 500 }
      );
    }
    
    // Select the mailbox to open with specific options to see all messages
    console.log(`[Mail API] Opening INBOX with full access to all messages`);
    const mailbox = await client.mailboxOpen('INBOX', {
      readOnly: false,
      // These options ensure we see both new and existing messages
      condstore: false, // Don't use CONDSTORE extension
      // Make sure to include messages in the cur directory (seen messages)
      specialUse: false // Don't use special-use flags which might filter messages
    });
    
    console.log(`[Mail API] Opened INBOX with ${mailbox.exists} messages`);
    console.log(`[Mail API] INBOX details: uidValidity=${mailbox.uidValidity}, uidNext=${mailbox.uidNext}, highestModseq=${mailbox.highestModseq}`);
    
    // Fetch the most recent 20 messages
    const messages = [];
    const messageCount = mailbox.exists;
    
    if (messageCount > 0) {
      // Get the range of message numbers to fetch (most recent 20 messages)
      const startSeq = Math.max(1, messageCount - 19);
      const endSeq = messageCount;
      
      // Fetch messages in the range - get full message content
      for await (const message of client.fetch(`${startSeq}:${endSeq}`, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
        source: true // Get the full RFC822 source of the message
      })) {
        try {
          // Debug log the message object structure without exposing sensitive data
          console.log(`[Mail API] Processing message ${message.uid}, has flags: ${!!message.flags}, flags type: ${typeof message.flags}`);
          if (message.flags) {
            console.log(`[Mail API] Flags: ${JSON.stringify(Array.isArray(message.flags) ? message.flags : Object.keys(message.flags))}`);
          }
          
          // Get full message source - this is the RFC822 complete message
          // Handle different types of source content
          let sourceContent = '';
          
          if (!message.source) {
            console.log(`[Mail API] Warning: Message ${message.uid} has no source content`);
          } else {
            // Handle different possible types of the source property
            if (typeof message.source === 'string') {
              sourceContent = message.source;
              console.log(`[Mail API] Message ${message.uid} has string source, length: ${sourceContent.length}`);
            } else if (message.source instanceof Buffer) {
              sourceContent = message.source.toString('utf8');
              console.log(`[Mail API] Message ${message.uid} has Buffer source, length: ${sourceContent.length}`);
            } else if (typeof message.source === 'object') {
              // Handle case where source might be a stream or another object
              console.log(`[Mail API] Message ${message.uid} source is an object type: ${message.source.constructor?.name || 'unknown'}`);
              // Try to get a readable form
              sourceContent = String(message.source);
            } else {
              console.log(`[Mail API] Message ${message.uid} has unknown source type: ${typeof message.source}`);
              // Convert whatever it is to a string
              try {
                sourceContent = String(message.source);
              } catch (e) {
                console.error(`[Mail API] Could not convert source to string: ${e.message}`);
              }
            }
            
            // Only try to show preview if we have a string
            if (sourceContent && typeof sourceContent === 'string') {
              console.log(`[Mail API] Message ${message.uid} source length: ${sourceContent.length}`);
              try {
                // Show the first part of the message to troubleshoot, safely
                const preview = sourceContent.substring(0, Math.min(200, sourceContent.length));
                console.log(`[Mail API] Message ${message.uid} source preview: ${preview}...`);
              } catch (e) {
                console.error(`[Mail API] Error creating preview: ${e.message}`);
              }
            }
          }
          
          // Parse the complete message using the full RFC822 source
          // First we need to handle the case where source might not be parseable
          let parsedMessage;
          try {
            // Pass the source to the parser - it can handle both string and Buffer
            parsedMessage = await simpleParser(message.source || sourceContent);
          } catch (parseError) {
            console.error(`[Mail API] Error parsing message with simpleParser: ${parseError.message}`);
            // Try to create a basic parsed message object as fallback
            parsedMessage = {
              subject: `Message ${message.uid}`,
              from: { text: 'Unknown Sender', value: [{ name: 'Unknown', address: 'unknown@example.com' }] },
              to: { text: mailAddress, value: [{ name: mailAddress, address: mailAddress }] },
              date: new Date(),
              text: `Could not parse email content. Error: ${parseError.message}`,
              html: `<p>Could not parse email content.</p><p>Error: ${parseError.message}</p>`
            };
          }
          
          // Log what we managed to extract
          console.log(`[Mail API] Parsed message ${message.uid}:`);
          console.log(`  Subject: ${parsedMessage.subject || '(No Subject)'}`);
          console.log(`  From: ${parsedMessage.from?.text || 'Unknown'}`);
          console.log(`  To: ${parsedMessage.to?.text || 'Unknown'}`);
          console.log(`  Date: ${parsedMessage.date?.toISOString() || 'Unknown'}`);
          console.log(`  Text body length: ${parsedMessage.text?.length || 0}`);
          console.log(`  HTML body length: ${parsedMessage.html?.length || 0}`);
          
          // Extract message data
          // CRITICAL FIX: Force flags to be always treated as an array to avoid includes errors
          const flags = message.flags || [];
          const flagsArray = Array.isArray(flags) ? flags : 
                             (typeof flags === 'string' ? [flags] : 
                             (typeof flags === 'object' ? Object.keys(flags) : []));
          
          console.log(`[Mail API] Message ${message.uid} flags converted to array: ${JSON.stringify(flagsArray)}`);
                       
          const messageData = {
            id: message.uid,
            subject: parsedMessage.subject || '(No Subject)',
            from: {
              name: parsedMessage.from?.value[0]?.name || parsedMessage.from?.value[0]?.address || 'Unknown',
              email: parsedMessage.from?.value[0]?.address || ''
            },
            to: {
              name: parsedMessage.to?.value[0]?.name || user.email,
              email: user.email
            },
            // Use indexOf for maximum compatibility instead of includes
            read: flagsArray.indexOf('\\Seen') >= 0,
            flagged: flagsArray.indexOf('\\Flagged') >= 0,
            answered: flagsArray.indexOf('\\Answered') >= 0,
            // Initialize starred and archived to false (will be overwritten by metadata if exists)
            starred: false,
            archived: false,
            labels: [],
            timestamp: parsedMessage.date?.toISOString() || new Date().toISOString(),
            // Include the full text content
            text: parsedMessage.text || '',
            // Include HTML content if available
            html: parsedMessage.html || '',
            // Keep snippet for inbox preview
            snippet: parsedMessage.text?.substring(0, 120) + '...' || '',
            encryptedBody: false,
            attachments: parsedMessage.attachments?.map(att => ({
              name: att.filename,
              size: att.size || 0,
              contentType: att.contentType
            })) || []
          };
          
          // Add any special labels based on flags or headers
          // Use the safe flagsArray instead of direct flag access
          if (flagsArray.indexOf('\\Flagged') >= 0) {
            messageData.labels.push('important');
          }
          
          // Check for PGP public key attachments
          if (parsedMessage.attachments && parsedMessage.attachments.length > 0) {
            for (const attachment of parsedMessage.attachments) {
              // Look for .asc files or PGP key content types
              if (attachment.filename?.endsWith('.asc') || 
                  attachment.contentType === 'application/pgp-keys' ||
                  attachment.filename?.toLowerCase().includes('public') && attachment.filename?.toLowerCase().includes('key')) {
                
                console.log(`[Mail API] Found potential public key attachment: ${attachment.filename}`);
                
                try {
                  // Get the attachment content
                  const keyContent = attachment.content?.toString('utf8') || '';
                  
                  // Basic validation - check if it looks like a PGP public key
                  if (keyContent.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
                    console.log(`[Mail API] Valid PGP public key found in attachment ${attachment.filename}`);
                    
                    // Parse the key to extract metadata
                    try {
                      const { default: pgpUtils } = await import('@/lib/auth/pgp');
                      const keyInfo = await pgpUtils.getKeyInfo(keyContent);
                      
                      console.log(`[Mail API] Extracted key info:`, {
                        keyId: keyInfo.keyId,
                        fingerprint: keyInfo.fingerprint,
                        email: messageData.from.email,
                        name: messageData.from.name
                      });
                      
                      // Store the public key in the database
                      if (db.publicKeys) {
                        await db.publicKeys.store({
                          email: messageData.from.email,
                          publicKey: keyContent,
                          keyId: keyInfo.keyId,
                          fingerprint: keyInfo.fingerprint,
                          name: messageData.from.name || keyInfo.userIds[0]?.name,
                          source: 'attachment',
                          userId: userId // Associate with the inbox owner
                        });
                        
                        console.log(`[Mail API] Successfully stored public key for ${messageData.from.email}`);
                      } else {
                        console.warn(`[Mail API] publicKeys module not available in db`);
                      }
                    } catch (keyError) {
                      console.error(`[Mail API] Error parsing/storing public key:`, keyError.message);
                    }
                  }
                } catch (attachError) {
                  console.error(`[Mail API] Error processing attachment ${attachment.filename}:`, attachError.message);
                }
              }
            }
          }
          
          // Check for keyserver links in email body
          const emailBody = parsedMessage.text || parsedMessage.html || '';
          const keyserverRegex = /https?:\/\/(?:keys\.openpgp\.org|keyserver\.ubuntu\.com|pgp\.mit\.edu|keybase\.io)\/[^\s<>"]+/gi;
          const keyserverLinks = emailBody.match(keyserverRegex);
          
          if (keyserverLinks && keyserverLinks.length > 0) {
            console.log(`[Mail API] Found keyserver links in email:`, keyserverLinks);
            
            // Store the first keyserver link as metadata
            // In a full implementation, we'd fetch the key from the keyserver
            // For now, just log it
            for (const link of keyserverLinks) {
              console.log(`[Mail API] TODO: Fetch public key from keyserver: ${link}`);
              // Future: Implement keyserver fetch and store
            }
          }
          
          // Check for PGP encrypted content
          if (parsedMessage.text && parsedMessage.text.includes('-----BEGIN PGP MESSAGE-----')) {
            messageData.encryptedBody = true;
            messageData.labels.push('encrypted');
          }
          
          // Add the message to our array
          messages.push(messageData);
        } catch (parseError) {
          console.error(`[Mail API] Error parsing message ${message.uid}:`, parseError);
        }
      }
      
      // Sort messages by date (newest first)
      messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Fetch email metadata (starred, archived) for all messages
      if (messages.length > 0) {
        try {
          const { query } = await import('@/lib/db');
          const messageIds = messages.map(m => m.id);
          const placeholders = messageIds.map(() => '?').join(',');
          const metadata = await query(
            `SELECT email_id, starred, archived FROM email_metadata
             WHERE user_email = ? AND email_id IN (${placeholders})`,
            [user.email, ...messageIds]
          );

          // Create a map for quick lookup
          const metadataMap = {};
          for (const meta of metadata) {
            metadataMap[meta.email_id] = {
              starred: meta.starred === 1,
              archived: meta.archived === 1
            };
          }

          // Add metadata to messages
          for (const msg of messages) {
            const meta = metadataMap[msg.id];
            msg.starred = meta?.starred || false;
            msg.archived = meta?.archived || false;
          }

          console.log(`[Mail API] Added metadata for ${metadata.length} messages`);
        } catch (metaError) {
          console.error('[Mail API] Error fetching email metadata:', metaError);
          // Continue without metadata
        }
      }
    }

    // Connection will be closed in finally block
    
    // Safely serialize the messages to avoid circular references
    try {
      // Convert to a plain object to avoid circular references 
      const safeMessages = JSON.parse(JSON.stringify(messages));
      return NextResponse.json({ messages: safeMessages });
    } catch (serializeError) {
      console.error('[Mail API] Error serializing messages:', serializeError);
      
      // Create a manually sanitized version of the messages if JSON.stringify fails
      const sanitizedMessages = messages.map(msg => ({
        id: msg.id,
        subject: msg.subject,
        from: {
          name: msg.from?.name || 'Unknown',
          email: msg.from?.email || ''
        },
        to: {
          name: msg.to?.name || '',
          email: msg.to?.email || ''
        },
        read: !!msg.read,
        flagged: !!msg.flagged,
        answered: !!msg.answered,
        labels: Array.isArray(msg.labels) ? [...msg.labels] : [],
        timestamp: msg.timestamp,
        snippet: msg.snippet || '',
        encryptedBody: !!msg.encryptedBody,
        attachments: (msg.attachments || []).map(att => ({
          name: att.name || 'attachment',
          size: att.size || 0,
          contentType: att.contentType || 'application/octet-stream'
        }))
      }));
      
      return NextResponse.json({ messages: sanitizedMessages });
    }
    
  } catch (error) {
    console.error('[Mail API] Error fetching inbox:', error);
    
    // Special handling for authentication errors - return empty inbox instead of error
    if (error.authenticationFailed || error.message.includes('authentication') || 
        error.message.includes('AUTHENTICATE') || error.message.includes('AUTHENTICATIONFAILED')) {
      console.log('[Mail API] Authentication issue detected, returning empty inbox instead of error');
      return NextResponse.json({ 
        messages: [], 
        warning: 'Authentication issue detected, showing empty inbox',
        authIssue: true
      });
    }
      
    return NextResponse.json(
      { error: 'Error fetching inbox', details: error.message },
      { status: 500 }
    );
  } finally {
    // Always ensure the IMAP client is properly closed to avoid connection issues
    if (client) {
      try {
        if (client.authenticated) {
          await client.logout();
          console.log('[Mail API] Successfully logged out and closed IMAP connection');
        } else if (client.socket && client.socket.readable) {
          await client.close();
          console.log('[Mail API] Successfully closed IMAP connection');
        }
      } catch (closeError) {
        console.error('[Mail API] Error closing IMAP connection:', closeError.message);
      }
    }
  }
}