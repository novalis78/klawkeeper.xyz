import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Get Specific Email by ID
 *
 * Returns full email content including body and attachments
 */
export async function GET(request, { params }) {
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

    const emailId = params.id;

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
      await client.mailboxOpen('INBOX');

      // Fetch the specific message
      const message = await client.fetchOne(emailId, {
        source: true,
        envelope: true,
        uid: true
      });

      if (!message) {
        await client.logout();
        return NextResponse.json(
          { error: 'Email not found' },
          { status: 404 }
        );
      }

      // Parse the email
      const parsed = await simpleParser(message.source);

      await client.logout();

      // Extract attachments info
      const attachments = parsed.attachments?.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        // Don't include content by default to save bandwidth
        // Agents can request specific attachments separately if needed
      })) || [];

      // Return email details
      return NextResponse.json({
        id: emailId,
        from: message.envelope.from?.[0]?.address || 'unknown',
        fromName: message.envelope.from?.[0]?.name || null,
        to: message.envelope.to?.map(t => t.address) || [],
        subject: message.envelope.subject || '(no subject)',
        date: message.envelope.date,
        body: {
          text: parsed.text || '',
          html: parsed.html || null
        },
        attachments,
        headers: parsed.headers ? Object.fromEntries(parsed.headers) : {}
      });
    } catch (imapError) {
      console.error('IMAP error:', imapError);
      await client.logout().catch(() => {});

      return NextResponse.json(
        {
          error: 'Failed to retrieve email',
          details: imapError.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Email retrieval error:', error);
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
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
