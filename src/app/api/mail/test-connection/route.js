/**
 * Test mail connection API endpoint
 * 
 * This API tests the connection to IMAP and SMTP servers using provided credentials
 */
import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { 
      email, 
      password, 
      imapServer, 
      imapPort = 993, 
      imapSecure = true,
      smtpServer, 
      smtpPort = 587, 
      smtpSecure = false 
    } = body;
    
    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const results = {
      imap: { success: false, error: null },
      smtp: { success: false, error: null }
    };
    
    // Test IMAP connection
    if (imapServer) {
      try {
        const client = new ImapFlow({
          host: imapServer,
          port: imapPort,
          secure: imapSecure,
          auth: {
            user: email,
            pass: password
          },
          logger: false,
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
          }
        });
        
        // Connect to the server
        await client.connect();
        
        // Try to open the INBOX to verify full authentication
        const mailbox = await client.mailboxOpen('INBOX');
        
        // Logout
        await client.logout();
        
        results.imap = { 
          success: true, 
          mailboxExists: mailbox.exists,
          server: imapServer,
          port: imapPort
        };
      } catch (error) {
        console.error('IMAP connection test error:', error);
        results.imap = {
          success: false,
          error: error.message || 'Failed to connect to IMAP server'
        };
      }
    }
    
    // Test SMTP connection
    if (smtpServer) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpServer,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: email,
            pass: password
          },
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
          }
        });
        
        // Verify connection
        await transporter.verify();
        
        results.smtp = { 
          success: true,
          server: smtpServer,
          port: smtpPort
        };
      } catch (error) {
        console.error('SMTP connection test error:', error);
        results.smtp = {
          success: false,
          error: error.message || 'Failed to connect to SMTP server'
        };
      }
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error testing mail connection:', error);
    
    return NextResponse.json(
      { error: 'Error testing mail connection', details: error.message },
      { status: 500 }
    );
  }
}