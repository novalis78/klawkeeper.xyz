import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Test database connection endpoint
 * 
 * This endpoint attempts to execute a simple query against the database
 * to verify that the connection is working properly.
 */
export async function GET(request) {
  try {
    // Try to execute a simple query
    const result = await testDatabaseConnection();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      details: result,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        isConnected: db.isConnected(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Test connection error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      code: error.code,
      env: {
        // Safely show if connection string is set (without showing actual value)
        databaseUrlSet: !!process.env.DATABASE_URL,
        jwtSecretSet: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}

/**
 * Test the database connection by trying a simple query
 * @returns {Promise<Object>} - Connection test result
 */
async function testDatabaseConnection() {
  try {
    // Log the connection params (safely, without credentials)
    const dbUrl = process.env.DATABASE_URL || 'Not set';
    const maskedUrl = dbUrl.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@');
    console.log('Testing connection to:', maskedUrl);
    
    // First check if we can get the server version (doesn't require any tables)
    const versionResult = await db.query('SELECT VERSION() as version');
    const version = versionResult[0]?.version || 'Unknown';
    
    // Display the connection config used
    console.log('Connected using mysql2 to version:', version);
    
    // Try to get the list of tables to verify schema access
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY table_name
    `);
    
    console.log('Tables found:', tablesResult.length);
    
    // Get user count if users table exists
    let userCount = null;
    const hasTables = tablesResult.length > 0;
    const hasUsersTable = tablesResult.some(row => row.table_name === 'users');
    
    if (hasUsersTable) {
      const userCountResult = await db.query('SELECT COUNT(*) as count FROM users');
      userCount = userCountResult[0]?.count ?? null;
    }
    
    return {
      connected: true,
      version,
      tables: tablesResult.map(row => row.table_name),
      tableCount: tablesResult.length,
      hasUsersTable,
      userCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Rethrow with more specific message
    const enhancedError = new Error(`Database connection test failed: ${error.message}`);
    enhancedError.code = error.code;
    enhancedError.original = error;
    throw enhancedError;
  }
}