import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import validation from '@/lib/utils/validation';
import accountManager from '@/lib/mail/accountManager';

export const dynamic = 'force-dynamic';

/**
 * Agent Registration Endpoint
 *
 * Allows AI agents to autonomously register for email service
 * Returns an API key for subsequent requests
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { agentId, name, email } = body;

    // Validate required fields
    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Generate email if not provided
    let agentEmail = email;
    if (!agentEmail) {
      // Generate a unique email address for the agent
      const cleanAgentId = agentId.toLowerCase().replace(/[^a-z0-9]/g, '-');
      agentEmail = `agent-${cleanAgentId}-${crypto.randomBytes(4).toString('hex')}@keykeeper.world`;
    }

    // Validate email format
    if (!validation.isValidEmail(agentEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.users.findByEmail(agentEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 }
      );
    }

    // Generate user ID and API key
    const userId = crypto.randomUUID();
    const apiKey = `kk_${crypto.randomBytes(32).toString('hex')}`;

    // Hash the API key for storage
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Create agent account
    await db.query(
      `INSERT INTO users (
        id, email, name, account_type, status, api_key, credits
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, agentEmail, name || agentId, 'agent', 'active', apiKey, 0]
    );

    // Create mail account
    const mailPassword = crypto.randomBytes(32).toString('hex');

    try {
      await accountManager.createMailAccount(
        agentEmail,
        mailPassword,
        name || agentId,
        parseInt(process.env.DEFAULT_MAIL_QUOTA || '1024'),
        userId
      );

      // Store mail password
      await db.users.updateMailPassword(userId, mailPassword);

      // Log mail account creation
      await db.activityLogs.create(userId, 'mail_account_creation', {
        email: agentEmail,
        success: true,
        accountType: 'agent'
      });
    } catch (mailError) {
      console.error('Error creating mail account for agent:', mailError);
      // Continue anyway - mail can be set up later
    }

    // Log agent registration
    await db.activityLogs.create(userId, 'agent_registration', {
      ipAddress: request.headers.get('x-forwarded-for') || request.ip,
      agentId,
      email: agentEmail
    });

    // Return API key and account details
    return NextResponse.json(
      {
        success: true,
        message: 'Agent registered successfully',
        apiKey,
        email: agentEmail,
        userId,
        credits: 0,
        note: 'Store your API key securely - it cannot be retrieved later. Add credits via /v1/agent/payment to start sending emails.'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Server error during registration: ' + error.message },
      { status: 500 }
    );
  }
}
