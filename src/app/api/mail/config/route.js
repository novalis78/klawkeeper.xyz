import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

// Mark this route as dynamically rendered
export const dynamic = 'force-dynamic';

/**
 * API route to get mail configuration settings
 * This provides safely accessible SMTP and IMAP settings without exposing credentials
 */
export async function GET(request) {
  try {
    // Check authentication if needed
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        await verifyToken(token);
      } catch (tokenError) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
    }
    
    // Return safe SMTP configuration settings
    return NextResponse.json({
      success: true,
      smtpConfig: {
        host: process.env.MAIL_HOST || '107.170.27.222',
        port: parseInt(process.env.MAIL_SMTP_PORT || '587'),
        secure: process.env.MAIL_SMTP_SECURE === 'true',
        requiresAuth: true,
        authMethods: ['PLAIN', 'LOGIN']
      },
      imapConfig: {
        host: process.env.MAIL_HOST || '107.170.27.222',
        port: parseInt(process.env.MAIL_IMAP_PORT || '993'),
        secure: process.env.MAIL_IMAP_SECURE !== 'false',
        requiresAuth: true,
        authMethods: ['PLAIN', 'LOGIN']
      }
    });
  } catch (error) {
    console.error('Error getting mail config:', error);
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}