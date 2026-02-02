import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Database status endpoint
 * 
 * This provides additional information about the database connection status
 * and the DB module in general.
 */
export async function GET(request) {
  // Get information about the database connection status without attempting to connect
  const statusInfo = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    isConnected: db.isConnected(),
    databaseConfig: {
      url: process.env.DATABASE_URL 
        ? process.env.DATABASE_URL.replace(/:\/\/([^:]+):[^@]+@/, '://USER:PASS@') // Mask password
        : 'Not set',
      isSet: !!process.env.DATABASE_URL,
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    // Copy of test API attributes for comparison
    test: db.test || 'Not present'
  };

  // Return information
  return NextResponse.json(statusInfo, { status: 200 });
}