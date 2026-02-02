import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/contacts/delete
 * Delete a contact
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
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    // Verify ownership and delete
    const result = await db.query(
      'DELETE FROM public_keys WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    console.log('[Contacts] Deleted contact:', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Contacts Delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
