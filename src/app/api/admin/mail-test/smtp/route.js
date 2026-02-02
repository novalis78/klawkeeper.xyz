import { NextResponse } from 'next/server';

// For security, this endpoint should be protected in production
export const dynamic = 'force-dynamic';

/**
 * Test SMTP connectivity
 * 
 * This endpoint is for administrative use only and tests the connection
 * to the SMTP mail server.
 */
export async function POST(request) {
  try {
    // Import nodemailer dynamically to avoid issues with server components
    const nodemailer = (await import('nodemailer')).default;
    
    // Get request body
    const { host, port, secure, user, pass } = await request.json();
    
    console.log('[SMTP Test API] Testing connection with parameters:', { 
      host: host || '172.17.0.1', 
      port: port || (secure ? 465 : 587), 
      secure: secure !== false // Default to true
    });
    
    // Create test configuration
    const config = {
      host: host || '172.17.0.1', // Use Docker bridge IP as default
      port: port || (secure ? 465 : 587),
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
    
    // Create transporter
    const transporter = nodemailer.createTransport(config);
    
    // Verify connection configuration
    const verification = await transporter.verify();
    
    // If we get here, the connection was successful
    console.log('[SMTP Test API] Connection successful');
    
    return NextResponse.json({ 
      success: true, 
      message: 'SMTP connection successful',
      details: {
        verified: verification,
        name: transporter.transporter?.name || 'Unknown',
        version: transporter.transporter?.version || 'Unknown',
        host: config.host,
        port: config.port,
        secure: config.secure
      }
    });
  } catch (error) {
    console.error('[SMTP Test API] Connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      }
    }, { status: 500 });
  }
}