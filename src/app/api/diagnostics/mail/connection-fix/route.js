import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Database Connection Fix API
 * Tests and fixes database connection issues
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
    
    // Run database connection tests and fixes
    const report = await testAndFixConnections(userId);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error in connection fix API:', error);
    return NextResponse.json(
      { error: 'Connection fix failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Test and fix database connections
 */
async function testAndFixConnections(userId) {
  const report = {
    timestamp: new Date().toISOString(),
    userId,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'not set',
      useMainDbForMail: process.env.USE_MAIN_DB_FOR_MAIL,
      mailUsersTable: process.env.MAIL_USERS_TABLE || 'virtual_users'
    },
    connections: {
      direct: { tried: false, success: false },
      parseUrl: { tried: false, success: false },
      getMailDbConnection: { tried: false, success: false },
      dbQuery: { tried: false, success: false }
    },
    databaseInfo: {},
    userCheck: { tried: false, success: false },
    mailAccountCheck: { tried: false, success: false },
    issues: [],
    fixes: []
  };

  // Method 1: Direct connection
  try {
    report.connections.direct.tried = true;
    
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Test the connection with a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    
    report.connections.direct.success = true;
    report.connections.direct.details = 'Direct connection using DATABASE_URL successful';
    
    await connection.end();
  } catch (directError) {
    report.connections.direct.error = directError.message;
    report.issues.push(`Direct connection failed: ${directError.message}`);
  }

  // Method 2: Parse URL and connect
  try {
    report.connections.parseUrl.tried = true;
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set');
    }
    
    // Parse the URL
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
    
    // Create connection with parsed components
    const connection = await mysql.createConnection({
      host: hostname,
      port: parsedPort,
      user: username,
      password: password,
      database: database
    });
    
    // Test the connection
    const [rows] = await connection.execute('SELECT 1 as test');
    
    report.connections.parseUrl.success = true;
    report.connections.parseUrl.details = {
      host: hostname,
      port: parsedPort,
      database: database,
      connected: true
    };
    
    // Get database info
    const [charsetRows] = await connection.execute(
      'SELECT @@character_set_database, @@collation_database'
    );
    
    report.databaseInfo = {
      charset: charsetRows[0]['@@character_set_database'],
      collation: charsetRows[0]['@@collation_database']
    };
    
    // Check if user exists
    report.userCheck.tried = true;
    const [userRows] = await connection.execute(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    );
    
    if (userRows.length > 0) {
      report.userCheck.success = true;
      report.userCheck.details = {
        id: userRows[0].id,
        email: userRows[0].email
      };
    } else {
      report.userCheck.error = 'User not found';
      report.issues.push(`User with ID ${userId} not found`);
    }
    
    // Check for mail account
    if (report.userCheck.success) {
      report.mailAccountCheck.tried = true;
      const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
      
      try {
        const [mailRows] = await connection.execute(
          `SELECT id, email, username, password FROM ${tableName} WHERE user_id = ?`,
          [userId]
        );
        
        if (mailRows.length > 0) {
          report.mailAccountCheck.success = true;
          report.mailAccountCheck.details = {
            id: mailRows[0].id,
            email: mailRows[0].email,
            username: mailRows[0].username,
            passwordType: mailRows[0].password ? mailRows[0].password.substring(0, 15) + '...' : 'not set'
          };
        } else {
          report.mailAccountCheck.error = 'Mail account not found';
          report.issues.push(`Mail account for user ${userId} not found in ${tableName} table`);
          
          // Check for alternative formats
          try {
            const [altRows] = await connection.execute(
              `SELECT id, email, username, user_id FROM ${tableName} LIMIT 5`
            );
            
            if (altRows.length > 0) {
              report.mailAccountCheck.sampleRows = altRows;
            }
          } catch (sampleError) {
            // Ignore sample error
          }
        }
      } catch (mailError) {
        report.mailAccountCheck.error = mailError.message;
        report.issues.push(`Error checking mail account: ${mailError.message}`);
      }
    }
    
    await connection.end();
  } catch (parseError) {
    report.connections.parseUrl.error = parseError.message;
    report.issues.push(`Parsed URL connection failed: ${parseError.message}`);
  }

  // Method 3: db.getMailDbConnection
  try {
    report.connections.getMailDbConnection.tried = true;
    
    const mailConn = await db.getMailDbConnection();
    
    if (mailConn) {
      // Test connection
      let success = false;
      try {
        const [rows] = await mailConn.execute('SELECT 1 as test');
        success = true;
      } catch (testError) {
        report.connections.getMailDbConnection.error = testError.message;
        report.issues.push(`Mail DB connection test query failed: ${testError.message}`);
      }
      
      report.connections.getMailDbConnection.success = success;
      
      // Close connection
      if (mailConn.release) {
        mailConn.release();
      } else if (mailConn.end) {
        await mailConn.end();
      }
    } else {
      report.connections.getMailDbConnection.error = 'getMailDbConnection returned null or undefined';
      report.issues.push('getMailDbConnection returned null or undefined');
    }
  } catch (mailDbError) {
    report.connections.getMailDbConnection.error = mailDbError.message;
    report.issues.push(`getMailDbConnection failed: ${mailDbError.message}`);
  }

  // Method 4: db.query
  try {
    report.connections.dbQuery.tried = true;
    
    const results = await db.query('SELECT 1 as test');
    
    report.connections.dbQuery.success = true;
    
    // Try to get user with db.query
    try {
      const userResults = await db.query('SELECT id, email FROM users WHERE id = ?', [userId]);
      
      if (userResults && userResults.length > 0) {
        report.connections.dbQuery.userFound = true;
      } else {
        report.connections.dbQuery.userFound = false;
        report.issues.push('db.query could not find user');
      }
    } catch (userQueryError) {
      report.connections.dbQuery.userQueryError = userQueryError.message;
      report.issues.push(`db.query user check failed: ${userQueryError.message}`);
    }
    
    // Try to get mail account with db.query
    try {
      const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
      const mailResults = await db.query(
        `SELECT id, email, username FROM ${tableName} WHERE user_id = ?`, 
        [userId]
      );
      
      if (mailResults && mailResults.length > 0) {
        report.connections.dbQuery.mailAccountFound = true;
      } else {
        report.connections.dbQuery.mailAccountFound = false;
        report.issues.push('db.query could not find mail account');
      }
    } catch (mailQueryError) {
      report.connections.dbQuery.mailQueryError = mailQueryError.message;
      report.issues.push(`db.query mail account check failed: ${mailQueryError.message}`);
    }
  } catch (dbQueryError) {
    report.connections.dbQuery.error = dbQueryError.message;
    report.issues.push(`db.query failed: ${dbQueryError.message}`);
  }

  // Generate fix recommendations
  if (report.connections.parseUrl.success && !report.connections.getMailDbConnection.success) {
    report.fixes.push({
      type: 'mail_db_connection',
      description: 'Fix getMailDbConnection in db.js',
      details: 'The direct database connection works, but getMailDbConnection is failing'
    });
  }
  
  if (report.mailAccountCheck.tried && !report.mailAccountCheck.success) {
    if (report.mailAccountCheck.sampleRows) {
      report.fixes.push({
        type: 'mail_account_query',
        description: 'Check user_id format in mail account queries',
        details: 'Mail accounts exist in the database but the query cannot find the specific account'
      });
    } else {
      report.fixes.push({
        type: 'create_mail_account',
        description: 'Create mail account for user',
        details: 'No mail account exists for this user in the database'
      });
    }
  }
  
  if (report.issues.some(issue => issue.includes('No database selected'))) {
    report.fixes.push({
      type: 'database_selection',
      description: 'Fix database selection in connection',
      details: 'The DATABASE_URL might be parsed incorrectly or missing database name'
    });
  }
  
  return report;
}