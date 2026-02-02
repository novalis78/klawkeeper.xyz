import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { verifyApiKey } from '@/lib/auth/apiKey';
import { evaluateRateLimitRequest } from '@/lib/ai/rateLimitEvaluator';

export const dynamic = 'force-dynamic';

/**
 * Request Rate Limit Increase (AI-to-AI Negotiation)
 *
 * AI agents submit justification for higher daily send limits.
 * Our AI evaluates the request and approves/rejects automatically.
 *
 * POST /api/v1/agent/rate-limit/request
 * Authorization: Bearer <api_key>
 *
 * Body:
 * {
 *   "requestedLimit": 500,
 *   "justification": "I am a customer service agent handling support tickets for Acme Corp..."
 * }
 */
export async function POST(request) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);
    const user = await verifyApiKey(apiKey);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { requestedLimit, justification } = body;

    // Validate input
    if (!requestedLimit || typeof requestedLimit !== 'number' || requestedLimit < 1) {
      return NextResponse.json(
        { error: 'Invalid requestedLimit. Must be a positive number.' },
        { status: 400 }
      );
    }

    if (!justification || typeof justification !== 'string' || justification.length < 50) {
      return NextResponse.json(
        {
          error: 'Justification required. Please provide at least 50 characters explaining your use case.',
          hint: 'Be specific: What emails are you sending? Who are the recipients? What is your legitimate purpose?'
        },
        { status: 400 }
      );
    }

    if (justification.length > 2000) {
      return NextResponse.json(
        { error: 'Justification too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    // Get current user info
    const [userData] = await db.query(
      `SELECT id, email, daily_send_limit, account_type, created_at, credits
       FROM users WHERE id = ?`,
      [user.id]
    );

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentLimit = userData.daily_send_limit || 100;

    // Don't allow requesting a lower limit (just contact support for that)
    if (requestedLimit <= currentLimit) {
      return NextResponse.json(
        {
          error: `Your current limit is ${currentLimit}. This endpoint is for increases only.`,
          currentLimit
        },
        { status: 400 }
      );
    }

    // Don't allow absurd requests (max 10,000/day for AI evaluation)
    if (requestedLimit > 10000) {
      return NextResponse.json(
        {
          error: 'Requested limit exceeds maximum (10,000/day). For higher limits, contact support@keykeeper.world',
          maxAutoApproval: 10000
        },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const [existingRequest] = await db.query(
      `SELECT id, status FROM rate_limit_requests
       WHERE user_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (existingRequest) {
      return NextResponse.json(
        {
          error: 'You already have a pending rate limit request. Please wait for it to be reviewed.',
          existingRequestId: existingRequest.id
        },
        { status: 409 }
      );
    }

    // Get usage history for AI evaluation
    const [emailStats] = await db.query(
      `SELECT
        COUNT(*) as total_emails_sent,
        DATEDIFF(NOW(), ?) as account_age_days,
        MAX(created_at) as last_email_sent
       FROM emails
       WHERE user_id = ?`,
      [userData.created_at, user.id]
    );

    const [last7Days] = await db.query(
      `SELECT COUNT(*) as emails_last_7_days
       FROM emails
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [user.id]
    );

    // Create request record
    const requestId = crypto.randomUUID();
    await db.query(
      `INSERT INTO rate_limit_requests
       (id, user_id, requested_limit, current_limit, justification, status, metadata)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [
        requestId,
        user.id,
        requestedLimit,
        currentLimit,
        justification,
        JSON.stringify({
          account_age_days: emailStats?.account_age_days || 0,
          total_emails_sent: emailStats?.total_emails_sent || 0,
          emails_last_7_days: last7Days?.emails_last_7_days || 0,
          current_credits: userData.credits || 0
        })
      ]
    );

    console.log(`[Rate Limit] Request created: ${requestId} for user ${user.email} (${currentLimit} → ${requestedLimit})`);

    // AI Evaluation happens asynchronously
    // Start evaluation in background
    evaluateRateLimitRequestAsync(requestId, {
      userId: user.id,
      userEmail: userData.email,
      accountType: userData.account_type,
      accountAgedays: emailStats?.account_age_days || 0,
      totalEmailsSent: emailStats?.total_emails_sent || 0,
      emailsLast7Days: last7Days?.emails_last_7_days || 0,
      currentCredits: userData.credits || 0,
      currentLimit,
      requestedLimit,
      justification
    });

    return NextResponse.json({
      success: true,
      requestId,
      status: 'pending',
      message: 'Your request is being evaluated by our AI. This usually takes 10-30 seconds.',
      currentLimit,
      requestedLimit,
      statusUrl: `/api/v1/agent/rate-limit/status/${requestId}`
    });

  } catch (error) {
    console.error('Rate limit request error:', error);
    return NextResponse.json(
      { error: 'Failed to process rate limit request: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Async wrapper to evaluate request without blocking response
 */
async function evaluateRateLimitRequestAsync(requestId, context) {
  try {
    // Small delay to return response to client first
    await new Promise(resolve => setTimeout(resolve, 100));

    const evaluation = await evaluateRateLimitRequest(context);

    // Update request with evaluation results
    await db.query(
      `UPDATE rate_limit_requests
       SET status = ?, ai_evaluation = ?, ai_decision_reasoning = ?,
           reviewed_by = 'ai', reviewed_at = NOW()
       WHERE id = ?`,
      [
        evaluation.decision,
        JSON.stringify(evaluation.analysis),
        evaluation.reasoning,
        requestId
      ]
    );

    // If approved, update user's rate limit
    if (evaluation.decision === 'approved') {
      await db.query(
        `UPDATE users
         SET daily_send_limit = ?, rate_limit_approved_by = 'ai',
             rate_limit_approved_at = NOW(), rate_limit_justification = ?
         WHERE id = ?`,
        [context.requestedLimit, context.justification, context.userId]
      );

      console.log(`[Rate Limit] ✅ APPROVED: User ${context.userEmail} increased to ${context.requestedLimit}/day`);
    } else if (evaluation.decision === 'rejected') {
      console.log(`[Rate Limit] ❌ REJECTED: User ${context.userEmail} - ${evaluation.reasoning}`);
    } else {
      console.log(`[Rate Limit] 👤 HUMAN REVIEW: User ${context.userEmail} - ${evaluation.reasoning}`);
    }

  } catch (error) {
    console.error(`Error evaluating rate limit request ${requestId}:`, error);

    // On error, mark as needs human review
    await db.query(
      `UPDATE rate_limit_requests
       SET status = 'needs_human_review',
           ai_decision_reasoning = ?
       WHERE id = ?`,
      ['AI evaluation failed: ' + error.message, requestId]
    );
  }
}
