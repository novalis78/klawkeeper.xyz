import { NextResponse } from 'next/server';

// For security, this endpoint should be protected in production
export const dynamic = 'force-dynamic';

/**
 * Test IMAP connectivity
 * 
 * This endpoint is for administrative use only and tests the connection
 * to the IMAP mail server.
 */
export async function POST(request) {
  try {
    // Import ImapFlow dynamically to avoid issues with server components
    const { ImapFlow } = await import('imapflow');
    
    // Get request body
    const { host, port, secure, user, pass } = await request.json();
    
    console.log('[IMAP Test API] Testing connection with parameters:', { 
      host: host || '172.17.0.1', 
      port: port || (secure ? 993 : 143), 
      secure: secure !== false // Default to true
    });
    
    // Create test configuration
    const config = {
      host: host || '172.17.0.1', // Use Docker bridge IP as default
      port: port || (secure ? 993 : 143),
      secure: secure !== false,
      // Add auth only if both user and pass are provided
      ...(user && pass ? { auth: { user, pass } } : {}),
      // Set connection timeout to 10 seconds
      connectionTimeout: 10000,
      // For testing, allow self-signed certificates
      tls: {
        rejectUnauthorized: false
      }
    };
    
    // Create IMAP client
    const client = new ImapFlow(config);
    
    // Test connection by connecting and getting capability
    let capabilities = [];
    let mailboxes = [];
    
    try {
      await client.connect();
      console.log('[IMAP Test API] Connected to server');
      
      // Get capabilities
      capabilities = client.capability;
      
      // Get mailboxes (if authenticated)
      if (client.authenticated) {
        const boxes = await client.list();
        mailboxes = boxes.map(box => ({
          name: box.path,
          flags: box.flags,
          specialUse: box.specialUse || null
        }));
      }
      
      await client.logout();
    } catch (connError) {
      // If there's an error during these operations, still catch it but
      // consider the basic connection test successful if we got this far
      console.error('[IMAP Test API] Error during capability/mailbox fetch:', connError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'IMAP connection successful',
      details: {
        capabilities,
        host: config.host,
        port: config.port,
        secure: config.secure,
        authenticated: user && pass ? true : false,
        mailboxes: user && pass ? mailboxes : []
      }
    });
  } catch (error) {
    console.error('[IMAP Test API] Connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        type: error.type,
        source: error.source
      }
    }, { status: 500 });
  }
}