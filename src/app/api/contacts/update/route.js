import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/contacts/update
 * Update a contact's information
 */
export async function PATCH(request) {
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
    const { id, name, trusted } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    // Verify ownership
    const contact = await db.query(
      'SELECT id FROM public_keys WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [id, userId]
    );

    if (contact.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (trusted !== undefined) {
      updates.push('trusted = ?');
      values.push(trusted ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(id);

    await db.query(
      `UPDATE public_keys SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    console.log('[Contacts] Updated contact:', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Contacts Update] Error:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}
