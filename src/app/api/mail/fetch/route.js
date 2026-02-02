import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchEmails } from '@/lib/mail/mailbox';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookies } from '@/lib/auth/jwt';
import passwordManager from '@/lib/users/passwordManager';

/**
 * API route to fetch emails from a specific folder
 * Uses JWT authentication and passwordManager to get credentials
 */

// Mark this route as dynamically rendered
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Enable real mail server integration
    process.env.USE_REAL_MAIL_SERVER = 'true';
    
    // Check for authentication token
    let token = extractTokenFromHeader(request);
    
    if (!token) {
      const cookieStore = cookies();
      token = extractTokenFromCookies(cookieStore);
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify the token
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 403 }
      );
    }
    
    const userId = tokenPayload.userId;
    
    // Get request body
    const body = await request.json();
    const { folder = 'inbox', limit = 50, offset = 0, search = '' } = body;
    
    console.log(`[Mail API] Fetching emails from '${folder}' folder for user ${userId}`);
    
    // Get the user's mail account
    const mailAccount = await passwordManager.getPrimaryMailAccount(userId);
    if (!mailAccount) {
      console.log(`[Mail API] Could not retrieve mail account for user ${userId}`);
      return NextResponse.json(
        { error: 'Could not retrieve mail account information' },
        { status: 500 }
      );
    }
    
    console.log(`[Mail API] Found mail account: ${mailAccount.email}`);

    // Get the password from the mail account (stored in virtual_users table)
    // The password is stored with {PLAIN} prefix, remove it if present
    let password = mailAccount.password;
    if (!password) {
      console.log(`[Mail API] Could not retrieve mail password for user ${userId}`);
      return NextResponse.json(
        { error: 'Could not retrieve mail password' },
        { status: 500 }
      );
    }

    // Remove {PLAIN} prefix if present (Dovecot password format)
    if (password.startsWith('{PLAIN}')) {
      password = password.substring(7);
    }

    console.log(`[Mail API] Retrieved password for ${mailAccount.email}`);
    
    const options = {
      limit,
      offset,
      search: search || undefined,
      fetchBody: true,
      imapConfig: {
        auth: {
          user: mailAccount.email,
          pass: password
        }
      }
    };
    
    // Handle folder name case sensitivity
    const targetFolder = folder.toLowerCase() === 'sent' ? 'Sent' : folder;
    
    console.log(`[Mail API] Fetching from folder: ${targetFolder}`);

    // Add timeout to prevent infinite hangs
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Mail fetch timeout after 30 seconds')), 30000);
    });

    let emails;
    try {
      emails = await Promise.race([
        fetchEmails(mailAccount.email, targetFolder, options),
        timeoutPromise
      ]);
    } catch (fetchError) {
      console.error(`[Mail API] Error fetching from ${targetFolder}:`, fetchError.message);
      // Return empty array on timeout or error instead of failing completely
      return NextResponse.json({
        success: true,
        emails: [],
        meta: {
          folder: targetFolder,
          total: 0,
          limit,
          offset,
          error: fetchError.message
        }
      });
    }

    console.log(`[Mail API] Found ${emails.length} emails in '${targetFolder}' folder`);
    
    return NextResponse.json({
      success: true,
      emails,
      meta: {
        folder: targetFolder,
        total: emails.length,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('[Mail API] Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Support GET method as well
export async function GET(request) {
  // Convert GET parameters to POST body format
  const { searchParams } = new URL(request.url);
  
  const mockBody = {
    folder: searchParams.get('folder') || 'inbox',
    limit: parseInt(searchParams.get('limit')) || 50,
    offset: parseInt(searchParams.get('offset')) || 0,
    search: searchParams.get('search') || ''
  };
  
  // Create a mock request with the body
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(mockBody)
  });
  
  return POST(mockRequest);
}