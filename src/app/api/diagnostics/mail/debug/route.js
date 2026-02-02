import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '@/lib/db';
import passwordManager from '@/lib/users/passwordManager';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

/**
 * Advanced mail system debugging API endpoint
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
    
    // Generate comprehensive debugging report
    const report = await generateDebugReport(userId);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error running advanced mail debug:', error);
    return NextResponse.json(
      { error: 'Debug process failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate comprehensive debugging report
 */
async function generateDebugReport(userId) {
  const report = {
    timestamp: new Date().toISOString(),
    userId,
    environment: getEnvironmentInfo(),
    connections: {
      main: { success: false, details: null },
      mail: { success: false, details: null }
    },
    database: {
      tables: [],
      queries: []
    },
    codePaths: {
      passwordManager: {},
      accountManager: {}
    },
    mailServer: {
      status: null,
      dovecot: null,
      ports: {}
    },
    issues: [],
    conclusion: ""
  };

  // 1. Check environment variables
  try {
    // Add detailed environment info
    report.environment.details = {
      mainDb: {
        url: process.env.DATABASE_URL ? 
             process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 
             'not set'
      },
      mailDb: {
        host: process.env.MAIL_DB_HOST || 'not set',
        user: process.env.MAIL_DB_USER ? '[SET]' : 'not set',
        password: process.env.MAIL_DB_PASSWORD ? '[SET]' : 'not set',
        name: process.env.MAIL_DB_NAME || 'not set'
      }
    };
    
    // Check for conflicting or missing settings
    if (process.env.USE_MAIN_DB_FOR_MAIL === 'true') {
      if (process.env.MAIL_DB_HOST || process.env.MAIL_DB_USER || 
          process.env.MAIL_DB_PASSWORD || process.env.MAIL_DB_NAME) {
        report.issues.push('USE_MAIN_DB_FOR_MAIL is true but separate mail DB settings are defined');
      }
    } else {
      if (!process.env.MAIL_DB_HOST || !process.env.MAIL_DB_USER || 
          !process.env.MAIL_DB_PASSWORD) {
        report.issues.push('USE_MAIN_DB_FOR_MAIL is not true but mail DB settings are incomplete');
      }
    }
    
    if (process.env.USE_REAL_MAIL_SERVER !== 'true') {
      report.issues.push('USE_REAL_MAIL_SERVER is not set to true - using mock data');
    }
  } catch (envError) {
    report.issues.push(`Environment check error: ${envError.message}`);
  }

  // 2. Test database connections
  try {
    // Main database connection
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not set');
      }
      
      // Parse DATABASE_URL
      const url = process.env.DATABASE_URL;
      const withoutProtocol = url.replace(/^mysql2?:\/\//, '');
      const [userPart, hostPart] = withoutProtocol.split('@');
      const [username, password] = userPart.split(':');
      const [host, dbPart] = hostPart.split('/');
      const [hostname, port] = host.split(':');
      const parsedPort = port ? parseInt(port, 10) : 3306;
      
      let database = dbPart;
      if (dbPart && dbPart.includes('?')) {
        database = dbPart.split('?')[0];
      }
      
      // Create connection
      const mainConnection = await mysql.createConnection({
        host: hostname,
        port: parsedPort,
        user: username,
        password: password,
        database: database
      });
      
      report.connections.main.success = true;
      report.connections.main.details = {
        host: hostname,
        port: parsedPort,
        database,
        connected: true
      };
      
      // Get tables in main database
      const [tables] = await mainConnection.execute('SHOW TABLES');
      report.database.tables = tables.map(table => Object.values(table)[0]);
      
      // Check for user
      const [userResults] = await mainConnection.execute(
        'SELECT id, email FROM users WHERE id = ?',
        [userId]
      );
      
      report.database.queries.push({
        type: 'user',
        query: `SELECT id, email FROM users WHERE id = '${userId}'`,
        results: userResults.length,
        success: userResults.length > 0
      });
      
      if (userResults.length === 0) {
        report.issues.push(`User with ID ${userId} not found in database`);
      }
      
      // Check for virtual_users table
      const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
      if (report.database.tables.includes(tableName)) {
        // Check for mail accounts
        const [accountResults] = await mainConnection.execute(
          `SELECT * FROM ${tableName} WHERE user_id = ?`,
          [userId]
        );
        
        report.database.queries.push({
          type: 'mailAccount',
          query: `SELECT * FROM ${tableName} WHERE user_id = '${userId}'`,
          results: accountResults.length,
          success: accountResults.length > 0
        });
        
        if (accountResults.length === 0) {
          report.issues.push(`No mail accounts found for user ${userId} in ${tableName} table`);
          
          // Try with different formats or cases
          const cleanId = userId.replace(/-/g, '');
          const [formatResults] = await mainConnection.execute(
            `SELECT * FROM ${tableName} WHERE REPLACE(user_id, '-', '') = ? OR LOWER(user_id) = LOWER(?)`,
            [cleanId, userId]
          );
          
          report.database.queries.push({
            type: 'mailAccountAlternative',
            query: `SELECT * FROM ${tableName} WITH ALTERNATIVE FORMATS`,
            results: formatResults.length,
            success: formatResults.length > 0
          });
          
          if (formatResults.length > 0) {
            report.issues.push('Found mail accounts with different user_id format or case');
          }
          
          // List some sample accounts
          const [sampleResults] = await mainConnection.execute(
            `SELECT id, email, username, user_id FROM ${tableName} LIMIT 5`
          );
          
          if (sampleResults.length > 0) {
            report.database.sampleAccounts = sampleResults;
          }
        } else {
          report.database.mailAccount = accountResults[0];
        }
        
        // Describe the table structure
        const [columns] = await mainConnection.execute(`DESCRIBE ${tableName}`);
        report.database.mailTableStructure = columns;
      } else {
        report.issues.push(`Table ${tableName} not found in main database`);
      }
      
      await mainConnection.end();
    } catch (mainDbError) {
      report.connections.main.details = { error: mainDbError.message };
      report.issues.push(`Main database connection error: ${mainDbError.message}`);
    }
    
    // Mail database connection (if separate)
    if (process.env.USE_MAIN_DB_FOR_MAIL !== 'true') {
      try {
        const dbConfig = {
          host: process.env.MAIL_DB_HOST || 'localhost',
          user: process.env.MAIL_DB_USER,
          password: process.env.MAIL_DB_PASSWORD,
          database: process.env.MAIL_DB_NAME || 'vmail'
        };
        
        // Create connection
        const mailConnection = await mysql.createConnection(dbConfig);
        
        report.connections.mail.success = true;
        report.connections.mail.details = {
          host: dbConfig.host,
          database: dbConfig.database,
          connected: true
        };
        
        // Get tables in mail database
        const [mailTables] = await mailConnection.execute('SHOW TABLES');
        report.database.mailTables = mailTables.map(table => Object.values(table)[0]);
        
        const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
        if (report.database.mailTables.includes(tableName)) {
          // Check for mail accounts
          const [mailAccResults] = await mailConnection.execute(
            `SELECT * FROM ${tableName} WHERE user_id = ?`,
            [userId]
          );
          
          report.database.queries.push({
            type: 'separateMailAccount',
            query: `SELECT * FROM ${tableName} WHERE user_id = '${userId}'`,
            results: mailAccResults.length,
            success: mailAccResults.length > 0
          });
          
          if (mailAccResults.length === 0) {
            report.issues.push(`No mail accounts found for user ${userId} in separate mail database`);
          } else {
            report.database.separateMailAccount = mailAccResults[0];
          }
        } else {
          report.issues.push(`Table ${tableName} not found in separate mail database`);
        }
        
        await mailConnection.end();
      } catch (mailDbError) {
        report.connections.mail.details = { error: mailDbError.message };
        report.issues.push(`Separate mail database connection error: ${mailDbError.message}`);
      }
    } else {
      report.connections.mail.details = { info: 'Using main database for mail' };
    }
  } catch (dbError) {
    report.issues.push(`Database testing error: ${dbError.message}`);
  }

  // 3. Test passwordManager code paths
  try {
    // Test getMailAccounts functionality
    try {
      const accounts = await passwordManager.getMailAccounts(userId);
      report.codePaths.passwordManager.getMailAccounts = {
        success: true,
        results: accounts.length,
        accounts: accounts
      };
      
      if (accounts.length === 0) {
        report.issues.push('passwordManager.getMailAccounts returned no accounts');
      }
    } catch (getAccError) {
      report.codePaths.passwordManager.getMailAccounts = {
        success: false,
        error: getAccError.message
      };
      report.issues.push(`passwordManager.getMailAccounts error: ${getAccError.message}`);
    }
    
    // Test hasMailAccount functionality
    try {
      const hasAccount = await passwordManager.hasMailAccount(userId);
      report.codePaths.passwordManager.hasMailAccount = {
        success: true,
        result: hasAccount
      };
      
      if (!hasAccount) {
        report.issues.push('passwordManager.hasMailAccount returned false');
      }
    } catch (hasAccError) {
      report.codePaths.passwordManager.hasMailAccount = {
        success: false,
        error: hasAccError.message
      };
      report.issues.push(`passwordManager.hasMailAccount error: ${hasAccError.message}`);
    }
    
    // Test getPrimaryMailAccount functionality
    try {
      const primary = await passwordManager.getPrimaryMailAccount(userId);
      report.codePaths.passwordManager.getPrimaryMailAccount = {
        success: true,
        result: primary
      };
      
      if (!primary) {
        report.issues.push('passwordManager.getPrimaryMailAccount returned null');
      }
    } catch (primaryError) {
      report.codePaths.passwordManager.getPrimaryMailAccount = {
        success: false,
        error: primaryError.message
      };
      report.issues.push(`passwordManager.getPrimaryMailAccount error: ${primaryError.message}`);
    }
  } catch (codeError) {
    report.issues.push(`Code path testing error: ${codeError.message}`);
  }

  // 4. Check mail server status
  try {
    // Try to check if the mail server is running
    const mailHost = process.env.MAIL_HOST || 'localhost';
    const imapPort = process.env.MAIL_IMAP_PORT || '993';
    
    report.mailServer.status = {
      host: mailHost,
      imapPort: imapPort
    };
    
    // Use nc to check port
    try {
      await execAsync(`nc -z -w 2 ${mailHost} ${imapPort}`);
      report.mailServer.ports.imap = true;
    } catch (ncError) {
      report.mailServer.ports.imap = ncError.message.includes('succeeded');
      if (!report.mailServer.ports.imap) {
        report.issues.push(`Mail server port check failed: ${mailHost}:${imapPort}`);
      }
    }
    
    // Check for Dovecot process
    try {
      const { stdout } = await execAsync('ps aux | grep -i dovecot | grep -v grep');
      report.mailServer.dovecot = !!stdout.trim();
      
      if (!report.mailServer.dovecot) {
        report.issues.push('Dovecot process not found running on server');
      }
    } catch (psError) {
      report.mailServer.dovecot = false;
      report.issues.push('Could not check for Dovecot process');
    }
  } catch (serverError) {
    report.issues.push(`Mail server check error: ${serverError.message}`);
  }

  // 5. Compile all the findings and create a conclusion
  let conclusion = '';
  
  if (report.issues.length === 0) {
    conclusion = 'No issues detected. The mail system appears to be configured correctly.';
  } else {
    // Categorize issues
    const dbIssues = report.issues.filter(i => i.includes('database') || i.includes('DB'));
    const serverIssues = report.issues.filter(i => i.includes('server') || i.includes('Dovecot'));
    const configIssues = report.issues.filter(i => i.includes('not set') || i.includes('true'));
    const accountIssues = report.issues.filter(i => i.includes('account') || i.includes('user_id'));
    
    if (configIssues.length > 0) {
      conclusion += 'Configuration issues found: ';
      conclusion += configIssues.map(i => `"${i}"`).join(', ') + '. ';
    }
    
    if (dbIssues.length > 0) {
      conclusion += 'Database issues found: ';
      conclusion += dbIssues.map(i => `"${i}"`).join(', ') + '. ';
    }
    
    if (serverIssues.length > 0) {
      conclusion += 'Mail server issues found: ';
      conclusion += serverIssues.map(i => `"${i}"`).join(', ') + '. ';
    }
    
    if (accountIssues.length > 0) {
      conclusion += 'Mail account issues found: ';
      conclusion += accountIssues.map(i => `"${i}"`).join(', ') + '. ';
    }
    
    // Most critical issue first
    if (!report.connections.main.success) {
      conclusion = 'Critical: Main database connection failed. ' + conclusion;
    } else if (process.env.USE_REAL_MAIL_SERVER !== 'true') {
      conclusion = 'Critical: USE_REAL_MAIL_SERVER not set to true. ' + conclusion;
    } else if (process.env.USE_MAIN_DB_FOR_MAIL !== 'true' && !report.connections.mail.success) {
      conclusion = 'Critical: Mail database connection failed. ' + conclusion;
    }
  }
  
  report.conclusion = conclusion;

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