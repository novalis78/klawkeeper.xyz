/**
 * API endpoint to test mail tables setup
 * GET /api/test/mail-tables
 */

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import accountManager from '@/lib/mail/accountManager';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const results = {
      status: 'checking',
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Check database connection
    results.tests.databaseConnection = {
      name: 'Database Connection',
      status: 'checking'
    };

    try {
      const isConnected = db.isConnected();
      results.tests.databaseConnection.status = isConnected ? 'passed' : 'failed';
      results.tests.databaseConnection.message = isConnected
        ? 'Database pool is connected'
        : 'Database pool is not connected';
    } catch (error) {
      results.tests.databaseConnection.status = 'failed';
      results.tests.databaseConnection.error = error.message;
    }

    // Test 2: Check virtual_users table
    results.tests.virtualUsersTable = {
      name: 'virtual_users Table',
      status: 'checking'
    };

    try {
      const connection = await db.getMailDbConnection();

      if (!connection) {
        throw new Error('Failed to get mail database connection');
      }

      // Check if table exists
      const [tables] = await connection.query("SHOW TABLES LIKE 'virtual_users'");

      if (tables.length === 0) {
        results.tests.virtualUsersTable.status = 'failed';
        results.tests.virtualUsersTable.message = 'Table does not exist';
        results.tests.virtualUsersTable.action = 'Run schema.sql to create the table';
      } else {
        // Get table structure
        const [structure] = await connection.query('DESCRIBE virtual_users');
        const columns = structure.map(s => s.Field);

        // Check for user_id column
        const hasUserId = columns.includes('user_id');

        // Get row count
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM virtual_users');

        results.tests.virtualUsersTable.status = hasUserId ? 'passed' : 'warning';
        results.tests.virtualUsersTable.message = `Table exists with ${columns.length} columns`;
        results.tests.virtualUsersTable.columns = columns;
        results.tests.virtualUsersTable.rowCount = rows[0].count;
        results.tests.virtualUsersTable.hasUserId = hasUserId;

        if (!hasUserId) {
          results.tests.virtualUsersTable.warning = 'Missing user_id column';
          results.tests.virtualUsersTable.action = 'ALTER TABLE virtual_users ADD COLUMN user_id VARCHAR(36) NULL';
        }
      }

      await connection.end();
    } catch (error) {
      results.tests.virtualUsersTable.status = 'failed';
      results.tests.virtualUsersTable.error = error.message;
    }

    // Test 3: Check virtual_domains table
    results.tests.virtualDomainsTable = {
      name: 'virtual_domains Table',
      status: 'checking'
    };

    try {
      const connection = await db.getMailDbConnection();

      if (!connection) {
        throw new Error('Failed to get mail database connection');
      }

      const [tables] = await connection.query("SHOW TABLES LIKE 'virtual_domains'");

      if (tables.length === 0) {
        results.tests.virtualDomainsTable.status = 'failed';
        results.tests.virtualDomainsTable.message = 'Table does not exist';
      } else {
        const [domains] = await connection.query('SELECT * FROM virtual_domains');

        results.tests.virtualDomainsTable.status = domains.length > 0 ? 'passed' : 'warning';
        results.tests.virtualDomainsTable.message = `Table exists with ${domains.length} domain(s)`;
        results.tests.virtualDomainsTable.domains = domains.map(d => ({
          id: d.id,
          name: d.name
        }));

        if (domains.length === 0) {
          results.tests.virtualDomainsTable.warning = 'No domains configured';
          results.tests.virtualDomainsTable.action = 'INSERT INTO virtual_domains (name) VALUES (\'keykeeper.world\')';
        }
      }

      await connection.end();
    } catch (error) {
      results.tests.virtualDomainsTable.status = 'failed';
      results.tests.virtualDomainsTable.error = error.message;
    }

    // Test 4: Test accountManager functions
    results.tests.accountManagerFunctions = {
      name: 'Account Manager Functions',
      status: 'checking'
    };

    try {
      // Check if functions exist
      const hasFunctions = {
        createMailAccount: typeof accountManager.createMailAccount === 'function',
        getUserEmailByUserId: typeof accountManager.getUserEmailByUserId === 'function',
        checkMailAccount: typeof accountManager.checkMailAccount === 'function',
        deleteMailAccount: typeof accountManager.deleteMailAccount === 'function'
      };

      const allExist = Object.values(hasFunctions).every(v => v);

      results.tests.accountManagerFunctions.status = allExist ? 'passed' : 'failed';
      results.tests.accountManagerFunctions.functions = hasFunctions;
      results.tests.accountManagerFunctions.message = allExist
        ? 'All required functions are available'
        : 'Some functions are missing';
    } catch (error) {
      results.tests.accountManagerFunctions.status = 'failed';
      results.tests.accountManagerFunctions.error = error.message;
    }

    // Determine overall status
    const testStatuses = Object.values(results.tests).map(t => t.status);
    const hasFailed = testStatuses.includes('failed');
    const hasWarning = testStatuses.includes('warning');

    results.status = hasFailed ? 'failed' : hasWarning ? 'warning' : 'passed';
    results.summary = {
      passed: testStatuses.filter(s => s === 'passed').length,
      failed: testStatuses.filter(s => s === 'failed').length,
      warning: testStatuses.filter(s => s === 'warning').length
    };

    return NextResponse.json(results, {
      status: hasFailed ? 500 : 200
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
