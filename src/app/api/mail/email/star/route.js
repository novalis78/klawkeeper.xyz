import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mail/email/star
 * Star or unstar an email
 */
export async function POST(request) {
  try {
    const { id, userEmail, starred } = await request.json();

    if (!id || !userEmail) {
      return NextResponse.json(
        { error: 'Email ID and user email are required' },
        { status: 400 }
      );
    }

    // Update or insert the email metadata
    // First check if we have a record for this email
    const existing = await query(
      `SELECT id FROM email_metadata WHERE email_id = ? AND user_email = ?`,
      [id, userEmail]
    );

    if (existing.length > 0) {
      // Update existing record
      await query(
        `UPDATE email_metadata SET starred = ?, updated_at = NOW() WHERE email_id = ? AND user_email = ?`,
        [starred ? 1 : 0, id, userEmail]
      );
    } else {
      // Insert new record
      const { v4: uuidv4 } = await import('uuid');
      await query(
        `INSERT INTO email_metadata (id, email_id, user_email, starred, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, NOW(), NOW())`,
        [uuidv4(), id, userEmail, starred ? 1 : 0]
      );
    }

    return NextResponse.json({ success: true, starred });
  } catch (error) {
    console.error('[Email Star] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update star status' },
      { status: 500 }
    );
  }
}
