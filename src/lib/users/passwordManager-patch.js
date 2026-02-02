/**
 * Password Management Utilities - PATCHED VERSION
 * 
 * This patched version fixes issues with mail account retrieval by:
 * 1. Adding more robust error handling
 * 2. Using the database name explicitly in queries
 * 3. Ensuring connection is properly established
 */

import db from '@/lib/db';

const passwordManager = {
  /**
   * Get all virtual mail accounts for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of virtual mail accounts
   */
  async getMailAccounts(userId) {
    try {
      // Check if there are entries in the virtual_users table with this user_id
      let connection;
      try {
        connection = await db.getMailDbConnection();
        if (!connection) {
          console.error('Could not connect to mail database');
          
          // Fallback to main database connection if mail connection fails
          // This is a safety mechanism for when both tables are in the same DB
          if (process.env.USE_MAIN_DB_FOR_MAIL === 'true') {
            console.log('Falling back to main database connection for mail accounts');
            
            // Use db.query for main database queries
            const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
            
            // Try direct query through main connection
            const rows = await db.query(
              `SELECT id, email, username, password FROM ${tableName} WHERE user_id = ?`,
              [userId]
            );
            
            console.log(`Found ${rows?.length || 0} mail accounts using direct db.query`);
            
            return rows || [];
          }
          
          return [];
        }
      } catch (connError) {
        console.error('Error getting mail database connection:', connError);
        return [];
      }
      
      try {
        // Get the table name from env or use default
        const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
        
        // Ensure connection has a database selected
        let database;
        try {
          // Try to get the current database
          const [dbResult] = await connection.execute('SELECT DATABASE() as db');
          database = dbResult[0].db;
          
          if (!database) {
            console.error('No database selected in connection');
            
            // Try to extract database from DATABASE_URL as a fallback
            if (process.env.DATABASE_URL) {
              const url = process.env.DATABASE_URL;
              const match = url.match(/\/([^/?]+)/);
              if (match && match[1]) {
                database = match[1];
                console.log(`Using database name from DATABASE_URL: ${database}`);
              }
            }
            
            if (!database) {
              // If still no database, use a default
              database = process.env.MAIL_DB_NAME || 'keykeeperdb';
              console.log(`Using default database name: ${database}`);
            }
          }
        } catch (dbError) {
          console.error('Error determining database:', dbError);
          
          // Use default database name as fallback
          database = process.env.MAIL_DB_NAME || 'keykeeperdb';
          console.log(`Using default database name after error: ${database}`);
        }
        
        // Use fully qualified table name with database
        const fullTableName = database ? `${database}.${tableName}` : tableName;
        console.log(`Querying mail accounts from ${fullTableName}`);
        
        // Try the query with verbose logging
        try {
          const [rows] = await connection.execute(
            `SELECT id, email, username, password FROM ${fullTableName} WHERE user_id = ?`,
            [userId]
          );
          
          console.log(`Found ${rows?.length || 0} mail accounts for user ${userId}`);
          
          return rows || [];
        } catch (queryError) {
          console.error(`Error querying ${fullTableName}:`, queryError);
          
          // Try alternative queries if standard one fails
          if (queryError.message.includes('Unknown column') || rows?.length === 0) {
            console.log('Trying alternative query formats...');
            
            // Try case insensitive query
            try {
              const [altRows] = await connection.execute(
                `SELECT id, email, username, password FROM ${fullTableName} 
                 WHERE LOWER(user_id) = LOWER(?)`,
                [userId]
              );
              
              if (altRows?.length > 0) {
                console.log(`Found ${altRows.length} mail accounts with case-insensitive query`);
                return altRows;
              }
            } catch (altError) {
              console.error('Case-insensitive query failed:', altError);
            }
            
            // Try without dashes
            try {
              const cleanId = userId.replace(/-/g, '');
              const [cleanRows] = await connection.execute(
                `SELECT id, email, username, password FROM ${fullTableName} 
                 WHERE REPLACE(user_id, '-', '') = ?`,
                [cleanId]
              );
              
              if (cleanRows?.length > 0) {
                console.log(`Found ${cleanRows.length} mail accounts with no-dashes query`);
                return cleanRows;
              }
            } catch (cleanError) {
              console.error('No-dashes query failed:', cleanError);
            }
            
            // If all else fails, log sample accounts to help debug
            try {
              const [samples] = await connection.execute(
                `SELECT id, email, username, user_id FROM ${fullTableName} LIMIT 5`
              );
              
              if (samples?.length > 0) {
                console.log('Sample mail accounts found:');
                samples.forEach(s => console.log(`- ${s.email}, user_id: ${s.user_id}`));
              } else {
                console.log('No mail accounts found in table');
              }
            } catch (sampleError) {
              console.error('Error retrieving sample accounts:', sampleError);
            }
          }
          
          // Return empty array if queries failed
          return [];
        }
      } catch (error) {
        console.error('Error querying virtual_users:', error);
        return [];
      } finally {
        // Only release if it's a pool connection, close if it's a direct connection
        if (connection.release) {
          connection.release();
        } else if (connection.end) {
          await connection.end();
        }
      }
    } catch (error) {
      console.error('Error retrieving mail accounts:', error);
      return [];
    }
  },
  
  // Rest of original methods follow...
  // [Include all other methods from the original passwordManager.js here]
};

export default passwordManager;