import { NextResponse } from 'next/server';
import { fetchEmail, updateEmail, deleteEmail } from '@/lib/mail/mailbox';

/**
 * API route to fetch a specific email
 * Expects query parameters:
 * - id: the email ID (UID)
 * - email: the user's email address
 * - folder: (optional) the folder containing the email
 * - markAsRead: (optional) whether to mark as read (defaults to true)
 */

// Mark these routes as dynamically rendered
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Enable real mail server integration
    process.env.USE_REAL_MAIL_SERVER = 'true';
    
    // Get the URL parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userEmail = searchParams.get('email');
    const folder = searchParams.get('folder') || 'inbox';
    const markAsRead = searchParams.get('markAsRead') !== 'false';
    
    // Basic validation
    if (!id || !userEmail) {
      return NextResponse.json(
        { error: 'Email ID and user email are required' },
        { status: 400 }
      );
    }
    
    const email = await fetchEmail(id, markAsRead, folder, userEmail);
    
    return NextResponse.json({
      success: true,
      email
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * API route to update email metadata
 * Expects JSON body with:
 * - id: the email ID (UID)
 * - userEmail: the user's email address
 * - folder: the current folder containing the email
 * - updates: object with updates to apply (isRead, isStarred, folder, labels)
 */
export async function PATCH(request) {
  try {
    // Enable real mail server integration
    process.env.USE_REAL_MAIL_SERVER = 'true';
    
    // Parse the request body
    const data = await request.json();
    
    // Basic validation
    if (!data.id || !data.userEmail || !data.updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await updateEmail(
      data.id,
      data.updates,
      data.folder || 'inbox',
      data.userEmail
    );
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error updating email:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * API route to delete an email
 * Expects JSON body with:
 * - id: the email ID (UID)
 * - userEmail: the user's email address
 * - folder: the current folder containing the email
 * - permanent: (optional) whether to permanently delete
 */
export async function DELETE(request) {
  try {
    // Enable real mail server integration
    process.env.USE_REAL_MAIL_SERVER = 'true';
    
    // Parse the request body
    const data = await request.json();
    
    // Basic validation
    if (!data.id || !data.userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Log if we have credentials
    if (data.credentials) {
      console.log(`Using IMAP credentials for user: ${data.userEmail}`);
    } else {
      console.log('No IMAP credentials provided for deletion, will attempt without authentication');
    }

    // Create IMAP config if credentials are provided
    const imapConfig = data.credentials ? {
      auth: {
        user: data.userEmail,
        pass: data.credentials.password
      }
    } : undefined;
    
    const result = await deleteEmail(
      data.id,
      data.permanent || false,
      data.folder || 'inbox',
      data.userEmail,
      imapConfig // Pass the IMAP config with credentials
    );
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}