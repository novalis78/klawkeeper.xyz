import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Check Inbox for Agent
 *
 * Returns list of recent emails
 */
export async function GET(request) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);

    // Find user by API key
    const user = await db.users.findByApiKey(apiKey);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Check if this is an agent account
    if (user.account_type !== 'agent') {
      return NextResponse.json(
        { error: 'This endpoint is only for agent accounts' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const folder = searchParams.get('folder') || 'INBOX';

    // Get decrypted mail password
    const mailPassword = await getDecryptedMailPassword(user.mail_password);

    // Connect to IMAP
    const client = new ImapFlow({
      host: process.env.IMAP_HOST || 'localhost',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: true,
      auth: {
        user: user.email,
        pass: mailPassword
      },
      logger: false
    });

    try {
      await client.connect();

      // Select mailbox
      await client.mailboxOpen(folder);

      // Search for all messages
      const messages = await client.search({ all: true }, { uid: true });

      // Get the most recent messages
      const recentMessages = messages.slice(-limit);

      // Fetch message details
      const emails = [];
      for (const uid of recentMessages) {
        try {
          const message = await client.fetchOne(uid.toString(), {
            envelope: true,
            bodyStructure: true,
            uid: true
          });

          emails.push({
            id: uid.toString(),
            from: message.envelope.from?.[0]?.address || 'unknown',
            subject: message.envelope.subject || '(no subject)',
            date: message.envelope.date,
            hasAttachments: hasAttachments(message.bodyStructure)
          });
        } catch (fetchError) {
          console.error('Error fetching message:', fetchError);
        }
      }

      await client.logout();

      // Return inbox summary
      return NextResponse.json({
        folder,
        totalMessages: messages.length,
        returnedMessages: emails.length,
        emails: emails.reverse() // Most recent first
      });
    } catch (imapError) {
      console.error('IMAP error:', imapError);
      await client.logout().catch(() => {});

      return NextResponse.json(
        {
          error: 'Failed to access inbox',
          details: imapError.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Inbox check error:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Check if message has attachments
 */
function hasAttachments(bodyStructure) {
  if (!bodyStructure) return false;

  if (Array.isArray(bodyStructure)) {
    return bodyStructure.some(part => part.disposition === 'attachment');
  }

  if (bodyStructure.childNodes) {
    return bodyStructure.childNodes.some(node =>
      node.disposition === 'attachment'
    );
  }

  return false;
}

/**
 * Decrypt mail password stored in database
 */
async function getDecryptedMailPassword(encryptedData) {
  if (!encryptedData) {
    throw new Error('No mail password stored');
  }

  const crypto = await import('crypto');
  const secret = process.env.APP_SECRET || 'keykeeper-default-secret';
  const encKey = crypto.createHash('sha256').update(secret).digest();

  // Parse IV and encrypted data
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');

  // Decrypt
  const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
