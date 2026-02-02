import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Send Email via Agent API
 *
 * Deducts credits and sends email on behalf of the agent
 */
export async function POST(request) {
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

    // Parse request body
    const body = await request.json();
    const { to, subject, body: emailBody, html, replyTo } = body;

    // Validate required fields
    if (!to || !subject || (!emailBody && !html)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and body/html are required' },
        { status: 400 }
      );
    }

    // Check daily rate limit
    const dailyLimit = user.daily_send_limit || 100;
    const [dailyCount] = await db.query(
      `SELECT COUNT(*) as emails_today
       FROM emails
       WHERE user_id = ? AND created_at >= CURDATE()`,
      [user.id]
    );

    const emailsSentToday = dailyCount?.emails_today || 0;

    if (emailsSentToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: 'Daily rate limit exceeded',
          dailyLimit,
          emailsSentToday,
          message: 'You have reached your daily sending limit. Request an increase at /v1/agent/rate-limit/request',
          rateLimitRequestUrl: '/api/v1/agent/rate-limit/request'
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Check credit balance
    const creditCost = 1.0; // 1 credit per email
    const currentCredits = parseFloat(user.credits || 0);

    if (currentCredits < creditCost) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          currentBalance: currentCredits,
          required: creditCost,
          message: 'Add more credits via /v1/agent/payment'
        },
        { status: 402 } // Payment Required
      );
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: user.email,
        pass: await getDecryptedMailPassword(user.mail_password)
      }
    });

    // Send email
    const mailOptions = {
      from: user.email,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: emailBody,
      html: html || undefined,
      replyTo: replyTo || user.email
    };

    try {
      const info = await transporter.sendMail(mailOptions);

      // Deduct credits
      await db.users.updateCredits(user.id, -creditCost);

      // Log email sent
      await db.activityLogs.create(user.id, 'agent_email_sent', {
        to,
        subject,
        messageId: info.messageId,
        creditCost
      });

      // Log credit transaction
      await db.query(
        `INSERT INTO credit_transactions (
          id, user_id, transaction_type, amount, balance_after, description
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          user.id,
          'email_sent',
          -creditCost,
          currentCredits - creditCost,
          `Sent email to ${to}`
        ]
      );

      const response = NextResponse.json({
        success: true,
        messageId: info.messageId,
        creditsRemaining: currentCredits - creditCost,
        rateLimit: {
          dailyLimit,
          remaining: dailyLimit - emailsSentToday - 1,
          resetAt: new Date().setHours(24, 0, 0, 0)
        },
        message: 'Email sent successfully'
      });

      // Add rate limit headers (standard format)
      response.headers.set('X-RateLimit-Limit', dailyLimit.toString());
      response.headers.set('X-RateLimit-Remaining', (dailyLimit - emailsSentToday - 1).toString());
      response.headers.set('X-RateLimit-Reset', new Date().setHours(24, 0, 0, 0).toString());

      return response;
    } catch (smtpError) {
      console.error('SMTP error:', smtpError);
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: smtpError.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send email error:', error);
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
