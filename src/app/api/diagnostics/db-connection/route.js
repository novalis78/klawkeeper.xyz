import db from '@/lib/db';

export async function GET() {
  try {
    const connectionInfo = {
      module_version: db.test.version,
      initialized: db.test.initialized,
      isConnected: db.isConnected(),
      poolState: db.test.poolState,
      hostname: process.env.HOSTNAME || 'unknown',
      database_url_parts: {
        // Safe parsing of the database URL to avoid exposing full password
        host: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1].split('/')[0] : 'not-set',
        user: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('://')[1].split(':')[0] : 'not-set',
        database: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('/').pop().split('?')[0] : 'not-set'
      }
    };

    // Test a simple query to verify connection
    try {
      const testResults = await db.query('SELECT 1 AS test');
      connectionInfo.queryTest = {
        success: true,
        result: testResults
      };
    } catch (queryError) {
      connectionInfo.queryTest = {
        success: false,
        error: queryError.message,
        code: queryError.code,
        errno: queryError.errno
      };
    }

    return Response.json({ 
      status: connectionInfo.queryTest?.success ? 'connected' : 'error',
      message: connectionInfo.queryTest?.success ? 'Database connection successful' : 'Database connection failed',
      details: connectionInfo
    });
  } catch (error) {
    return Response.json({ 
      status: 'error', 
      message: 'Error checking database connection',
      error: error.message
    }, { 
      status: 500 
    });
  }
}