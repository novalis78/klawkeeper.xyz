import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '@/lib/db';
import passwordManager from '@/lib/users/passwordManager';

const execAsync = promisify(exec);

// Restrict this to admin or specific IPs in production
export const dynamic = 'force-dynamic';

/**
 * Mail system diagnostics with userId in path
 * This endpoint should be secured in production!
 */
export async function GET(request, { params }) {
  try {
    const userId = params.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Create a diagnostic report
    const report = await generateDiagnosticReport(userId);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error running mail diagnostics:', error);
    return NextResponse.json(
      { error: 'Diagnostic test failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate a comprehensive diagnostic report
 */
async function generateDiagnosticReport(userId) {
  const report = {
    timestamp: new Date().toISOString(),
    userId,
    environment: getEnvironmentInfo(),
    user: null,
    mailAccount: null,
    databaseConnections: {
      main: false,
      mail: false
    },
    passwordDerivation: {
      methods: [],
      samples: []
    },
    mailServer: {
      connection: false,
      dovecotRunning: false
    },
    imapTests: [],
    conclusion: {
      success: false,
      issues: [],
      recommendations: []
    }
  };

  // 1. Get user info
  try {
    const user = await db.users.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    report.user = {
      id: user.id,
      email: user.email,
      keyId: user.key_id,
      fingerprint: user.fingerprint,
      status: user.status,
      authMethod: user.auth_method
    };
    
    report.databaseConnections.main = true;
  } catch (error) {
    report.conclusion.issues.push(`User database error: ${error.message}`);
  }

  // 2. Check mail database connection and get mail account
  try {
    // Get mail accounts from passwordManager
    const accounts = await passwordManager.getMailAccounts(userId);
    
    if (accounts && accounts.length > 0) {
      const account = accounts[0];
      report.mailAccount = {
        id: account.id,
        email: account.email,
        username: account.username,
        passwordHashType: account.password ? account.password.split('}')[0] + '}' : 'NOT SET'
      };
      
      report.databaseConnections.mail = true;
    } else {
      report.conclusion.issues.push('No mail accounts found for this user');
    }
  } catch (error) {
    report.conclusion.issues.push(`Mail database error: ${error.message}`);
  }

  // 3. Test password derivation methods
  if (report.user) {
    const DOVECOT_AUTH_SALT = process.env.DOVECOT_AUTH_SALT || 'keykeeper-dovecot-auth';
    const DOVECOT_AUTH_VERSION = process.env.DOVECOT_AUTH_VERSION || '1';
    
    // Track the methods we're testing
    report.passwordDerivation.methods = [
      {
        name: 'standard',
        input: `${DOVECOT_AUTH_SALT}:${report.user.email}:${DOVECOT_AUTH_VERSION}`
      },
      {
        name: 'simple',
        input: `${DOVECOT_AUTH_SALT}:${report.user.email}`
      },
      {
        name: 'dovecot-specific',
        input: `dovecot-auth:${report.user.email}`
      },
      {
        name: 'email-only',
        input: report.user.email
      },
      {
        name: 'development',
        input: 'development-password'
      }
    ];
    
    // Generate sample passwords for testing
    for (const method of report.passwordDerivation.methods) {
      // For the development method, we directly use the string
      if (method.name === 'development') {
        report.passwordDerivation.samples.push({
          method: method.name,
          derivedPassword: 'development-password'
        });
        continue;
      }
      
      // For other methods, simulate a derivation
      const simulatedSignature = crypto.createHash('sha256').update(method.input).digest('hex');
      const hashBuffer = crypto.createHash('sha256').update(simulatedSignature).digest();
      const hashBase64 = Buffer.from(hashBuffer).toString('base64');
      
      const derivedPassword = hashBase64
        .substring(0, 32)
        .replace(/\+/g, 'A')
        .replace(/\//g, 'B')
        .replace(/=/g, 'C');
      
      report.passwordDerivation.samples.push({
        method: method.name,
        derivedPassword
      });
    }
  }

  // 4. Check mail server status
  try {
    // Try simple nc command to test connectivity
    try {
      const imapHost = process.env.MAIL_HOST || 'localhost';
      const imapPort = process.env.MAIL_IMAP_PORT || '993';
      
      await execAsync(`nc -z -w 5 ${imapHost} ${imapPort}`);
      report.mailServer.connection = true;
    } catch (ncError) {
      // Some errors still indicate a successful connection
      if (ncError.message.includes('succeeded')) {
        report.mailServer.connection = true;
      } else {
        report.conclusion.issues.push(`Mail server connection failed: ${ncError.message}`);
      }
    }
    
    // Check if dovecot is running
    try {
      const { stdout } = await execAsync('ps aux | grep -i dovecot | grep -v grep');
      report.mailServer.dovecotRunning = !!stdout.trim();
      
      if (!report.mailServer.dovecotRunning) {
        report.conclusion.issues.push('Dovecot process not found');
      }
    } catch (psError) {
      report.conclusion.issues.push(`Could not check Dovecot process: ${psError.message}`);
    }
  } catch (error) {
    report.conclusion.issues.push(`Mail server checks failed: ${error.message}`);
  }

  // 5. Test IMAP connections with each derived password
  if (report.mailAccount && report.passwordDerivation.samples.length > 0) {
    const imapHost = process.env.MAIL_HOST || 'localhost';
    const imapPort = parseInt(process.env.MAIL_IMAP_PORT || '993');
    const imapSecure = process.env.MAIL_IMAP_SECURE !== 'false';
    
    for (const sample of report.passwordDerivation.samples) {
      try {
        const client = new ImapFlow({
          host: imapHost,
          port: imapPort,
          secure: imapSecure,
          auth: {
            user: report.mailAccount.email,
            pass: sample.derivedPassword
          },
          logger: false,
          tls: {
            rejectUnauthorized: false // For testing
          },
          timeoutConnection: 5000 // 5 second timeout for faster testing
        });
        
        // Try to connect
        await client.connect();
        
        // Test INBOX access
        let inboxDetails = null;
        try {
          const mailbox = await client.mailboxOpen('INBOX');
          inboxDetails = {
            exists: mailbox.exists,
            name: mailbox.path
          };
        } catch (inboxError) {
          // No action needed, already captured in result
        }
        
        await client.logout();
        
        report.imapTests.push({
          method: sample.method,
          success: true,
          inbox: inboxDetails
        });
        
        // If successful, mark overall success
        report.conclusion.success = true;
      } catch (error) {
        report.imapTests.push({
          method: sample.method, 
          success: false,
          error: error.message
        });
      }
    }
  }

  // 6. Generate conclusions
  if (report.conclusion.success) {
    // Find the successful method
    const successMethod = report.imapTests.find(test => test.success);
    if (successMethod) {
      report.conclusion.recommendations.push(
        `Use the '${successMethod.method}' password derivation method in your code.`
      );
    }
  } else {
    // Generate recommendations based on issues
    if (!report.databaseConnections.main) {
      report.conclusion.recommendations.push('Check the main database connection settings.');
    }
    
    if (!report.databaseConnections.mail) {
      report.conclusion.recommendations.push('Check the mail database connection settings.');
    }
    
    if (!report.mailAccount) {
      report.conclusion.recommendations.push('Ensure the user has a mail account created in the virtual_users table.');
    }
    
    if (!report.mailServer.connection) {
      report.conclusion.recommendations.push('Verify the mail server is running and accessible.');
    }
    
    if (!report.mailServer.dovecotRunning) {
      report.conclusion.recommendations.push('Check if Dovecot is running on the server.');
    }
    
    if (report.imapTests.length > 0 && !report.imapTests.some(test => test.success)) {
      report.conclusion.recommendations.push(
        'None of the tested password derivation methods worked. Check Dovecot logs for auth failures.'
      );
      report.conclusion.recommendations.push(
        'Verify the password hash in virtual_users matches what Dovecot expects.'
      );
    }
  }

  return report;
}

/**
 * Get relevant environment information
 */
function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    mailHost: process.env.MAIL_HOST,
    mailImapPort: process.env.MAIL_IMAP_PORT,
    mailImapSecure: process.env.MAIL_IMAP_SECURE,
    usingRealMailServer: process.env.USE_REAL_MAIL_SERVER === 'true',
    mailUsersTable: process.env.MAIL_USERS_TABLE,
    mailPasswordScheme: process.env.MAIL_PASSWORD_SCHEME,
    dovecotAuthSalt: process.env.DOVECOT_AUTH_SALT ? '(set)' : '(not set)',
    dovecotAuthVersion: process.env.DOVECOT_AUTH_VERSION || '1'
  };
}