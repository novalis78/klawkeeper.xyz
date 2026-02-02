import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Direct Query Test API
 * Tests direct database queries to find mail accounts
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
    
    // Run direct database queries to bypass application logic
    const report = await testDirectQueries(userId);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error running query tests:', error);
    return NextResponse.json(
      { error: 'Query test failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Test direct database queries for mail account
 */
async function testDirectQueries(userId) {
  const report = {
    timestamp: new Date().toISOString(),
    userId,
    environment: {
      useMainDbForMail: process.env.USE_MAIN_DB_FOR_MAIL,
      mailUsersTable: process.env.MAIL_USERS_TABLE || 'virtual_users'
    },
    user: null,
    standardQueries: [],
    alternativeQueries: [],
    databaseInfo: {},
    tableInfo: {},
    recommendations: []
  };

  try {
    // Get user info
    const user = await db.users.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    report.user = {
      id: user.id,
      email: user.email
    };
    
    // Get connection to test queries
    let connection;
    const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
    
    // Try with direct connection first
    if (process.env.DATABASE_URL) {
      try {
        // Parse database URL
        const url = process.env.DATABASE_URL;
        const withoutProtocol = url.replace(/^mysql2?:\/\//, '');
        const [userPart, hostPart] = withoutProtocol.split('@');
        const [username, password] = userPart.split(':');
        const [host, dbPart] = hostPart.split('@');
        const [hostname, port] = host.split(':');
        const parsedPort = port ? parseInt(port, 10) : 3306;
        
        let database = dbPart;
        if (dbPart && dbPart.includes('?')) {
          database = dbPart.split('?')[0];
        }
        
        // Create connection
        connection = await mysql.createConnection({
          host: hostname,
          port: parsedPort,
          user: username,
          password: password,
          database: database
        });
        
        report.connectionMethod = 'direct';
      } catch (directError) {
        report.connectionError = directError.message;
      }
    }
    
    // Fall back to using db.query
    if (!connection) {
      connection = {
        execute: async (sql, params) => {
          const results = await db.query(sql, params);
          return [results];
        },
        query: async (sql, params) => {
          const results = await db.query(sql, params);
          return [results];
        }
      };
      
      report.connectionMethod = 'db.query';
    }
    
    // Test standard query used in passwordManager.js
    const [standardRows] = await connection.execute(
      `SELECT id, email, username, password FROM ${tableName} WHERE user_id = ?`,
      [userId]
    );
    
    report.standardQueries.push({
      name: 'Standard Query (passwordManager.js)',
      sql: `SELECT id, email, username, password FROM ${tableName} WHERE user_id = ?`,
      params: [userId],
      results: standardRows.length,
      success: standardRows.length > 0
    });
    
    // Test alternative queries only if standard query failed
    if (standardRows.length === 0) {
      // Case insensitive query
      const [caseRows] = await connection.execute(
        `SELECT id, email, username, password FROM ${tableName} WHERE LOWER(user_id) = LOWER(?)`,
        [userId]
      );
      
      report.alternativeQueries.push({
        name: 'Case Insensitive',
        sql: `SELECT id, email, username, password FROM ${tableName} WHERE LOWER(user_id) = LOWER(?)`,
        params: [userId],
        results: caseRows.length,
        success: caseRows.length > 0
      });
      
      // Without dashes
      const cleanId = userId.replace(/-/g, '');
      const [cleanRows] = await connection.execute(
        `SELECT id, email, username, password FROM ${tableName} WHERE REPLACE(user_id, '-', '') = ?`,
        [cleanId]
      );
      
      report.alternativeQueries.push({
        name: 'Without Dashes',
        sql: `SELECT id, email, username, password FROM ${tableName} WHERE REPLACE(user_id, '-', '') = ?`,
        params: [cleanId],
        results: cleanRows.length,
        success: cleanRows.length > 0
      });
      
      // LIKE query with partial match
      const [likeRows] = await connection.execute(
        `SELECT id, email, username, password FROM ${tableName} WHERE user_id LIKE ?`,
        [`%${userId.substring(0, 8)}%`]
      );
      
      report.alternativeQueries.push({
        name: 'LIKE with first 8 chars',
        sql: `SELECT id, email, username, password FROM ${tableName} WHERE user_id LIKE ?`,
        params: [`%${userId.substring(0, 8)}%`],
        results: likeRows.length,
        success: likeRows.length > 0
      });
    }
    
    // Get database info
    try {
      const [charsetRows] = await connection.execute(
        'SELECT @@character_set_database, @@collation_database'
      );
      
      report.databaseInfo = {
        charset: charsetRows[0]['@@character_set_database'],
        collation: charsetRows[0]['@@collation_database']
      };
    } catch (dbInfoError) {
      report.databaseInfo = { error: dbInfoError.message };
    }
    
    // Get table structure
    try {
      const [columnsRows] = await connection.execute(
        `DESCRIBE ${tableName}`
      );
      
      report.tableInfo.columns = columnsRows;
      
      // Check for case-sensitive issues
      const userIdCol = columnsRows.find(col => col.Field.toLowerCase() === 'user_id');
      if (userIdCol && userIdCol.Field !== 'user_id') {
        report.tableInfo.userIdColumnCase = userIdCol.Field;
      }
      
      // Check column collation 
      if (userIdCol) {
        try {
          const [colCharset] = await connection.execute(
            `SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = ? 
             AND COLUMN_NAME = ?`,
            [tableName, userIdCol.Field]
          );
          
          if (colCharset.length > 0) {
            report.tableInfo.userIdColumnCharset = colCharset[0].CHARACTER_SET_NAME;
            report.tableInfo.userIdColumnCollation = colCharset[0].COLLATION_NAME;
            
            if (colCharset[0].COLLATION_NAME && colCharset[0].COLLATION_NAME.includes('_cs')) {
              report.tableInfo.userIdCaseSensitive = true;
            } else {
              report.tableInfo.userIdCaseSensitive = false;
            }
          }
        } catch (colError) {
          report.tableInfo.collationError = colError.message;
        }
      }
    } catch (tableError) {
      report.tableInfo.error = tableError.message;
    }
    
    // Get sample accounts
    try {
      const [sampleRows] = await connection.execute(
        `SELECT id, email, username, user_id FROM ${tableName} LIMIT 5`
      );
      
      report.sampleAccounts = sampleRows;
    } catch (sampleError) {
      report.sampleError = sampleError.message;
    }
    
    // Generate recommendations
    if (report.standardQueries[0].success) {
      report.recommendations.push('Standard query works properly - no changes needed');
    } else {
      // Find best working query
      const workingQuery = report.alternativeQueries.find(q => q.success);
      
      if (workingQuery) {
        report.recommendations.push({
          title: 'Update passwordManager.js query',
          query: workingQuery.sql,
          params: workingQuery.params
        });
      } else if (report.sampleAccounts && report.sampleAccounts.length > 0) {
        report.recommendations.push({
          title: 'Check user_id format in database',
          description: 'The user_id format in the database does not match the format used in queries'
        });
      } else {
        report.recommendations.push({
          title: 'Create mail account for user',
          description: 'No mail account exists for this user and none could be found with alternative queries'
        });
      }
    }
    
    // Clean up if connection needs to be closed
    if (connection.end) {
      await connection.end();
    }
  } catch (error) {
    report.error = error.message;
    report.recommendations.push({
      title: 'Database Error',
      description: `An error occurred during query testing: ${error.message}`
    });
  }

  return report;
}