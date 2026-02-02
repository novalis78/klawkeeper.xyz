import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

// Draft limits per subscription tier
const DRAFT_LIMITS = {
  free: 1,
  trial: 10,
  active: 50,
  personal: 10,
  pro: 50,
  bitcoin: 50,
  cancelled: 1,
  expired: 1
};

/**
 * GET /api/drafts
 * List all drafts for the current user
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;

    // Get user's subscription status for draft limit info
    const users = await db.query(
      'SELECT subscription_status FROM users WHERE id = ?',
      [userId]
    );
    const subscriptionStatus = users[0]?.subscription_status || 'free';
    const draftLimit = DRAFT_LIMITS[subscriptionStatus] || DRAFT_LIMITS.free;

    // Get drafts ordered by most recently updated
    const drafts = await db.query(
      `SELECT id, recipient_to, recipient_cc, recipient_bcc, subject,
              LEFT(body, 200) as body_preview, attachments, created_at, updated_at
       FROM email_drafts
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [userId]
    );

    return NextResponse.json({
      drafts,
      draftCount: drafts.length,
      draftLimit,
      subscriptionStatus
    });

  } catch (error) {
    console.error('[Drafts List] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

/**
 * POST /api/drafts
 * Save a new draft or update an existing one
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;
    const { id, to, cc, bcc, subject, body, attachments } = await request.json();

    // Get user's subscription status for draft limit
    const users = await db.query(
      'SELECT subscription_status FROM users WHERE id = ?',
      [userId]
    );
    const subscriptionStatus = users[0]?.subscription_status || 'free';
    const draftLimit = DRAFT_LIMITS[subscriptionStatus] || DRAFT_LIMITS.free;

    // Check current draft count (only if creating a new draft)
    if (!id) {
      const countResult = await db.query(
        'SELECT COUNT(*) as count FROM email_drafts WHERE user_id = ?',
        [userId]
      );
      const currentCount = countResult[0]?.count || 0;

      if (currentCount >= draftLimit) {
        return NextResponse.json({
          error: `Draft limit reached (${draftLimit}). ${subscriptionStatus === 'free' ? 'Upgrade to save more drafts.' : 'Delete a draft to save a new one.'}`,
          draftLimit,
          currentCount
        }, { status: 403 });
      }
    }

    const attachmentsJson = attachments ? JSON.stringify(attachments) : null;

    if (id) {
      // Update existing draft
      const result = await db.query(
        `UPDATE email_drafts
         SET recipient_to = ?, recipient_cc = ?, recipient_bcc = ?,
             subject = ?, body = ?, attachments = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [to || '', cc || '', bcc || '', subject || '', body || '', attachmentsJson, id, userId]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Draft not found or access denied' }, { status: 404 });
      }

      console.log('[Drafts] Updated draft:', id);
      return NextResponse.json({ success: true, id, updated: true });
    } else {
      // Create new draft
      const result = await db.query(
        `INSERT INTO email_drafts (user_id, recipient_to, recipient_cc, recipient_bcc, subject, body, attachments)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, to || '', cc || '', bcc || '', subject || '', body || '', attachmentsJson]
      );

      const newId = result.insertId;
      console.log('[Drafts] Created new draft:', newId);
      return NextResponse.json({ success: true, id: newId, created: true });
    }

  } catch (error) {
    console.error('[Drafts Save] Error:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

/**
 * DELETE /api/drafts
 * Delete a draft by ID (passed in body)
 */
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId;
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    const result = await db.query(
      'DELETE FROM email_drafts WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Draft not found or access denied' }, { status: 404 });
    }

    console.log('[Drafts] Deleted draft:', id);
    return NextResponse.json({ success: true, deleted: true });

  } catch (error) {
    console.error('[Drafts Delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
