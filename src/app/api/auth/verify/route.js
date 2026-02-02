import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { authenticated: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-this'
      );

      // Get user from database
      const users = await query(
        'SELECT id, email, name, account_type, fingerprint, key_id FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0) {
        return NextResponse.json(
          { authenticated: false, error: 'User not found' },
          { status: 401 }
        );
      }

      const user = users[0];

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          accountType: user.account_type,
          fingerprint: user.fingerprint,
          keyId: user.key_id
        }
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return NextResponse.json(
        { authenticated: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
