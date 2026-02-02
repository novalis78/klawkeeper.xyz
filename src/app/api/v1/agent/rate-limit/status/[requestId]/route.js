import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyApiKey } from '@/lib/auth/apiKey';

export const dynamic = 'force-dynamic';

/**
 * Check Rate Limit Request Status
 *
 * GET /api/v1/agent/rate-limit/status/:requestId
 * Authorization: Bearer <api_key>
 */
export async function GET(request, { params }) {
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

    const { requestId } = params;

    // Get request details
    const [requestData] = await db.query(
      `SELECT
        r.id, r.requested_limit, r.current_limit, r.justification,
        r.status, r.ai_evaluation, r.ai_decision_reasoning,
        r.reviewed_by, r.reviewed_at, r.created_at,
        u.daily_send_limit as updated_limit
       FROM rate_limit_requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ? AND r.user_id = ?`,
      [requestId, user.id]
    );

    if (!requestData) {
      return NextResponse.json(
        { error: 'Request not found or does not belong to your account' },
        { status: 404 }
      );
    }

    const response = {
      requestId: requestData.id,
      status: requestData.status,
      requestedLimit: requestData.requested_limit,
      currentLimit: requestData.current_limit,
      createdAt: requestData.created_at,
      reviewedAt: requestData.reviewed_at
    };

    // Add status-specific details
    switch (requestData.status) {
      case 'pending':
        response.message = 'Your request is being evaluated. Please check back in a few seconds.';
        break;

      case 'approved':
        response.message = `Congratulations! Your rate limit has been increased to ${requestData.updated_limit} emails per day.`;
        response.newLimit = requestData.updated_limit;
        response.reasoning = requestData.ai_decision_reasoning;
        response.reviewedBy = requestData.reviewed_by;
        break;

      case 'rejected':
        response.message = 'Your request was not approved at this time.';
        response.reasoning = requestData.ai_decision_reasoning;
        response.reviewedBy = requestData.reviewed_by;
        response.canReapply = true;
        response.reapplyAfter = '7 days';
        break;

      case 'needs_human_review':
        response.message = 'Your request requires human review. This typically takes 1-2 business days.';
        response.reasoning = requestData.ai_decision_reasoning;
        break;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Rate limit status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status: ' + error.message },
      { status: 500 }
    );
  }
}
