import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/drafts/[id]
 * Get a single draft by ID
 */
export async function GET(request, { params }) {
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
    const { id } = await params;

    const drafts = await db.query(
      `SELECT id, recipient_to, recipient_cc, recipient_bcc, subject, body, attachments, created_at, updated_at
       FROM email_drafts
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (drafts.length === 0) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const draft = drafts[0];

    // Parse attachments JSON if present
    if (draft.attachments && typeof draft.attachments === 'string') {
      try {
        draft.attachments = JSON.parse(draft.attachments);
      } catch (e) {
        draft.attachments = [];
      }
    }

    return NextResponse.json({ draft });

  } catch (error) {
    console.error('[Drafts Get] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}

/**
 * DELETE /api/drafts/[id]
 * Delete a single draft by ID
 */
export async function DELETE(request, { params }) {
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
    const { id } = await params;

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
