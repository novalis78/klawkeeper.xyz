import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import mysql from 'mysql2/promise';
import db from '@/lib/db';
import passwordManager from '@/lib/users/passwordManager';

export const dynamic = 'force-dynamic';

/**
 * Mail system fix API endpoint
 * This endpoint should be secured in production!
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required as a query parameter' },
        { status: 400 }
      );
    }
    
    // Generate diagnostics and apply fixes
    const report = await generateFixReport(userId);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error running mail system fix:', error);
    return NextResponse.json(
      { error: 'Fix process failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate a comprehensive diagnostic and fix report
 */
async function generateFixReport(userId) {
  const report = {
    timestamp: new Date().toISOString(),
    userId,
    environment: getEnvironmentInfo(),
    diagnostics: {
      user: null,
      mailAccount: null,
      databaseConnections: {
        main: false,
        mail: false
      }
    },
    issues: [],
    fixes: [],
    testResults: {
      beforeFix: null,
      afterFix: null
    },
    recommendations: []
  };

  // 1. Run diagnostics to identify issues
  try {
    // Check user exists
    const user = await db.users.findById(userId);
    if (!user) {
      report.issues.push(`User with ID ${userId} not found`);
      return report;
    }
    
    report.diagnostics.user = {
      id: user.id,
      email: user.email,
      status: user.status
    };
    report.diagnostics.databaseConnections.main = true;
    
    // Check for mail account
    try {
      const hasMailAccount = await passwordManager.hasMailAccount(userId);
      report.diagnostics.beforeFixHasMailAccount = hasMailAccount;
      
      if (!hasMailAccount) {
        report.issues.push('No mail account found for user');
      } else {
        const mailAccount = await passwordManager.getPrimaryMailAccount(userId);
        report.diagnostics.mailAccount = {
          email: mailAccount.email,
          username: mailAccount.username
        };
        report.diagnostics.databaseConnections.mail = true;
      }
    } catch (mailError) {
      report.issues.push(`Mail account check error: ${mailError.message}`);
      
      // Try to determine if it's a database connection issue
      if (mailError.message.includes('connection') || 
          mailError.message.includes('ECONNREFUSED') ||
          mailError.message.includes('Access denied')) {
        report.issues.push('Mail database connection failed');
      }
    }
    
    // If we found the user but no mail account, or if mail DB connection failed
    if (report.diagnostics.user && (!report.diagnostics.mailAccount || !report.diagnostics.databaseConnections.mail)) {
      // Check database connections more directly
      try {
        // Get a direct connection to test
        const connection = await db.getMailDbConnection();
        
        if (connection) {
          report.fixes.push('Mail database connection is available');
          
          // Test if virtual_users table exists
          try {
            const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
            
            // Query the table
            const [rows] = await connection.execute(
              `SELECT COUNT(*) as count FROM information_schema.tables 
               WHERE table_schema = DATABASE() AND table_name = ?`, 
              [tableName]
            );
            
            if (rows[0].count > 0) {
              report.fixes.push(`Table ${tableName} exists in the database`);
              
              // Check for user's mail account directly
              try {
                const [accountRows] = await connection.execute(
                  `SELECT id, email, username FROM ${tableName} WHERE user_id = ?`,
                  [userId]
                );
                
                if (accountRows.length > 0) {
                  report.fixes.push(`Found ${accountRows.length} mail account(s) for user in database`);
                  report.diagnostics.directAccountCheck = {
                    found: true,
                    count: accountRows.length,
                    firstAccount: {
                      id: accountRows[0].id,
                      email: accountRows[0].email,
                      username: accountRows[0].username
                    }
                  };
                  
                  // If we found accounts directly but passwordManager.hasMailAccount returned false
                  if (!report.diagnostics.beforeFixHasMailAccount) {
                    report.issues.push('Mail account exists in database but not detected by the application');
                    
                    // Check possible code path issues
                    if (process.env.USE_REAL_MAIL_SERVER !== 'true') {
                      report.issues.push('USE_REAL_MAIL_SERVER is not set to true - using mock data');
                      report.fixes.push('Set USE_REAL_MAIL_SERVER=true');
                      
                      // Apply the fix
                      process.env.USE_REAL_MAIL_SERVER = 'true';
                    }
                    
                    if (process.env.USE_MAIN_DB_FOR_MAIL !== 'true') {
                      report.issues.push('USE_MAIN_DB_FOR_MAIL is not set to true');
                      report.fixes.push('Set USE_MAIN_DB_FOR_MAIL=true');
                      
                      // Apply the fix
                      process.env.USE_MAIN_DB_FOR_MAIL = 'true';
                    }
                  }
                } else {
                  report.issues.push('No mail accounts found in database for this user');
                  
                  // Check if the user_id format might be different
                  try {
                    // Try without hyphens
                    const cleanId = userId.replace(/-/g, '');
                    const [cleanRows] = await connection.execute(
                      `SELECT id, email, username FROM ${tableName} WHERE REPLACE(user_id, '-', '') = ?`,
                      [cleanId]
                    );
                    
                    if (cleanRows.length > 0) {
                      report.issues.push('Found mail accounts with user_id in different format (without hyphens)');
                    }
                    
                    // Try case insensitive
                    const [caseRows] = await connection.execute(
                      `SELECT id, email, username FROM ${tableName} WHERE LOWER(user_id) = LOWER(?)`,
                      [userId]
                    );
                    
                    if (caseRows.length > 0) {
                      report.issues.push('Found mail accounts with user_id in different case');
                    }
                  } catch (formatError) {
                    report.issues.push(`Error checking alternative user_id formats: ${formatError.message}`);
                  }
                }
              } catch (accountError) {
                report.issues.push(`Error querying mail accounts: ${accountError.message}`);
              }
            } else {
              report.issues.push(`Table ${tableName} does not exist in the database`);
            }
          } catch (tableError) {
            report.issues.push(`Error checking table existence: ${tableError.message}`);
          }
          
          // Close the connection if it has a release method
          if (connection.release) {
            connection.release();
          } else if (connection.end) {
            await connection.end();
          }
        } else {
          report.issues.push('Could not get mail database connection');
        }
      } catch (directDbError) {
        report.issues.push(`Direct database test error: ${directDbError.message}`);
      }
    }
  } catch (error) {
    report.issues.push(`General diagnostic error: ${error.message}`);
  }

  // 2. Apply recommended fixes based on issues
  if (report.issues.length > 0) {
    // Create a list of recommended environment variable changes
    const envChanges = {};
    
    // Ensure USE_MAIN_DB_FOR_MAIL is true for same-DB setups
    if (report.issues.some(issue => issue.includes('Mail database connection failed') || 
                                   issue.includes('USE_MAIN_DB_FOR_MAIL is not set to true'))) {
      envChanges.USE_MAIN_DB_FOR_MAIL = 'true';
    }
    
    // Ensure USE_REAL_MAIL_SERVER is true
    if (report.issues.some(issue => issue.includes('USE_REAL_MAIL_SERVER is not set to true'))) {
      envChanges.USE_REAL_MAIL_SERVER = 'true';
    }
    
    // Apply fixes temporarily for this request
    for (const [key, value] of Object.entries(envChanges)) {
      process.env[key] = value;
    }
    
    // Add the changes to the report
    report.appliedFixes = envChanges;
    
    // Provide configuration instructions
    if (Object.keys(envChanges).length > 0) {
      report.recommendations.push({
        title: 'Update environment variables',
        description: 'Add these environment variables to your deployment:',
        variables: envChanges
      });
    }
  }

  // 3. Test if mail account is accessible after fixes
  try {
    if (report.diagnostics.user) {
      const hasMailAccount = await passwordManager.hasMailAccount(userId);
      report.diagnostics.afterFixHasMailAccount = hasMailAccount;
      
      if (hasMailAccount) {
        const mailAccount = await passwordManager.getPrimaryMailAccount(userId);
        report.diagnostics.afterFixMailAccount = {
          email: mailAccount.email,
          username: mailAccount.username
        };
        
        // If we found the account after fixes, report success
        if (!report.diagnostics.beforeFixHasMailAccount && hasMailAccount) {
          report.outcome = 'Fixed successfully! Mail account is now accessible.';
        } else if (report.diagnostics.beforeFixHasMailAccount && hasMailAccount) {
          report.outcome = 'Mail account was already accessible. No fixes needed.';
        }
      } else {
        report.outcome = 'Mail account is still not accessible after fixes.';
        
        // Check if account exists in database
        if (report.diagnostics.directAccountCheck?.found) {
          report.recommendations.push({
            title: 'Application code issue',
            description: 'Mail account exists in database but not detected by application code.',
            steps: [
              'Check for code issues in user/passwordManager.js and mail/accountManager.js',
              'Verify database connection settings are consistent',
              'Check column names and case sensitivity in queries'
            ]
          });
        } else {
          report.recommendations.push({
            title: 'Create mail account',
            description: 'No mail account exists for this user. Create one with:',
            sql: `INSERT INTO ${process.env.MAIL_USERS_TABLE || 'virtual_users'} 
                  (domain_id, username, password, email, user_id) 
                  VALUES (1, '${report.diagnostics.user.email.split('@')[0]}', 
                  '{SHA512-CRYPT}...', '${report.diagnostics.user.email}', '${userId}');`
          });
        }
      }
    }
  } catch (error) {
    report.issues.push(`Post-fix test error: ${error.message}`);
  }

  // 4. Compile final recommendations based on all findings
  if (report.recommendations.length === 0) {
    if (report.issues.length > 0) {
      report.recommendations.push({
        title: 'Check mail server configuration',
        description: 'Issues were found but no automatic fixes could be applied.',
        steps: [
          'Verify Dovecot is running and accessible',
          'Check mail logs for authentication failures',
          'Review database structure and permissions'
        ]
      });
    } else {
      report.recommendations.push({
        title: 'No issues found',
        description: 'The mail system appears to be configured correctly.',
        steps: [
          'If you still experience issues, check mail server logs',
          'Verify IMAP connection settings in the client'
        ]
      });
    }
  }

  return report;
}

/**
 * Get environment information
 */
function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    useMainDbForMail: process.env.USE_MAIN_DB_FOR_MAIL,
    mailUsersTable: process.env.MAIL_USERS_TABLE || 'virtual_users',
    useRealMailServer: process.env.USE_REAL_MAIL_SERVER,
    mailHost: process.env.MAIL_HOST,
    mailImapPort: process.env.MAIL_IMAP_PORT
  };
}