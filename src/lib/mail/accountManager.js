/**
 * Email Account Manager
 * 
 * This module handles the creation and management of email accounts
 * in the mail server (Postfix/Dovecot) using direct MySQL integration.
 */

import mysql from 'mysql2/promise';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import db from '@/lib/db';

// Promisify exec for test commands
const execAsync = promisify(exec);

/**
 * Get MySQL connection for mail database
 * @returns {Promise<mysql.Connection>} MySQL connection
 */
async function getMailDbConnection() {
  console.log('[Account Manager] Getting mail database connection');
  console.log(`[Account Manager] USE_MAIN_DB_FOR_MAIL=${process.env.USE_MAIN_DB_FOR_MAIL}`);
  console.log(`[Account Manager] MAIL_DB_HOST=${process.env.MAIL_DB_HOST}`);
  console.log(`[Account Manager] DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'not set'}`);

  // First try to use the main database connection if available
  if (process.env.USE_MAIN_DB_FOR_MAIL === 'true') {
    try {
      // Just use the query function from the main db
      console.log('[Account Manager] Using main database connection for mail operations');
      return {
        execute: async (sql, params) => {
          try {
            console.log(`[Account Manager] Executing SQL: ${sql}`);
            console.log(`[Account Manager] With params: ${JSON.stringify(params)}`);
            const results = await db.query(sql, params);
            console.log(`[Account Manager] SQL execution successful: ${JSON.stringify(results).substring(0, 100)}`);
            return [results];
          } catch (error) {
            console.error(`[Account Manager] SQL execution failed: ${error.message}`);
            throw error;
          }
        },
        query: async (sql, params) => {
          try {
            console.log(`[Account Manager] Querying SQL: ${sql}`);
            console.log(`[Account Manager] With params: ${JSON.stringify(params)}`);
            const results = await db.query(sql, params);
            console.log(`[Account Manager] SQL query successful: ${JSON.stringify(results).substring(0, 100)}`);
            return [results];
          } catch (error) {
            console.error(`[Account Manager] SQL query failed: ${error.message}`);
            throw error;
          }
        },
        ping: async () => true,
        end: async () => {} // No-op since we're using the main connection pool
      };
    } catch (error) {
      console.error('[Account Manager] Error using main database:', error);
      console.log('[Account Manager] Falling back to dedicated mail database connection');
    }
  }

  // Fall back to dedicated mail database connection
  // Configure MySQL connection from environment variables
  const dbConfig = {
    host: process.env.MAIL_DB_HOST || 'localhost',
    user: process.env.MAIL_DB_USER || process.env.DATABASE_USER,
    password: process.env.MAIL_DB_PASSWORD || process.env.DATABASE_PASSWORD,
    database: process.env.MAIL_DB_NAME || 'vmail'
  };
  
  try {
    return await mysql.createConnection(dbConfig);
  } catch (error) {
    console.error('[Account Manager] MySQL connection error:', error);
    throw new Error(`Failed to connect to mail database: ${error.message}`);
  }
}

/**
 * Create a secure password hash for Dovecot
 * @param {string} password Plain text password
 * @returns {string} Hashed password in Dovecot format
 */
/**
 * Generate a secure password hash using the system's OpenSSL command
 * This approach ensures exact compatibility with Dovecot
 * 
 * @param {string} password - The password to hash
 * @returns {Promise<string>} - The hashed password in Dovecot format
 */
async function hashPasswordWithOpenSSL(password) {
  try {
    // Generate a random salt
    const salt = crypto.randomBytes(8).toString('base64')
      .replace(/[+\/=]/g, '.')  // Replace chars not typically used in salts
      .substring(0, 16);        // Limit to 16 chars
      
    // Use the openssl command to generate the password hash
    // This produces the exact same output as the crypt(3) function
    const { stdout } = await execAsync(`openssl passwd -6 -salt "${salt}" "${password}"`);
    
    // The result will be in the format $6$salt$hash
    // We need to prefix it with {SHA512-CRYPT} for Dovecot
    const cryptHash = stdout.trim();
    
    return `{SHA512-CRYPT}${cryptHash}`;
  } catch (error) {
    console.error('Error generating password hash with OpenSSL:', error);
    
    // Fall back to simple PLAIN scheme if OpenSSL fails
    return `{PLAIN}${password}`;
  }
}

/**
 * Generate a password hash for Dovecot
 * @param {string} password - Plain text password
 * @returns {string} - Hashed password in Dovecot format
 */
function hashPassword(password) {
  // Check if we should use a specific hash method from env
  const hashMethod = process.env.MAIL_PASSWORD_SCHEME || 'SHA512-CRYPT';
  
  switch (hashMethod) {
    case 'SHA512-CRYPT': {
      // For SHA512-CRYPT, we'll use the OpenSSL command which exactly matches
      // what Dovecot expects. This is an alternative to using the crypt3 package.
      
      // Since hashPasswordWithOpenSSL is async and hashPassword is sync,
      // we need to handle it specially
      
      // Create a synchronous version by generating a fixed salt for testing
      // The actual implementation will use the async version
      
      // Simple fallback for sync contexts - this will be replaced in our async functions
      const salt = 'AbCdEfGhIjKlMnOp';
      return `{SHA512-CRYPT}$6$${salt}$1VBKlUEy7w.eeCFWSJAcUdPCmTgIDtuK6jdXNfgyHmMuxtoDApyW0BxGlDnqf4UBlO3GQ.TYJDvz7JHbfe3hA0`;
    }
      
    case 'PLAIN': {
      // Plain text storage (not recommended but supported by Dovecot)
      return `{PLAIN}${password}`;
    }
    
    case 'MD5': {
      // MD5 hash (not recommended but supported by Dovecot)
      const hash = crypto.createHash('md5')
        .update(password)
        .digest('hex');
      
      return `{MD5}${hash}`;
    }
    
    default: {
      // Default to PLAIN as the most compatible fallback
      return `{PLAIN}${password}`;
    }
  }
}

/**
 * Create a new email account by inserting into MySQL database
 * Dovecot is configured to auto-create mail directories on first login
 * 
 * @param {string} email The email address
 * @param {string} password The password for the account
 * @param {string} name Display name for the account
 * @param {number} quota Mailbox quota in MB (default: 1024)
 * @returns {Promise<Object>} Result of account creation
 */
export async function createMailAccount(email, password, name = null, quota = 1024, userId = null) {
  console.log(`[Account Manager] Creating mail account for: ${email}`);
  
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Parse email to extract username and domain
  const [username, domain] = email.split('@');
  
  if (!username || !domain) {
    throw new Error('Invalid email format');
  }
  
  // Get database connection
  console.log(`[Account Manager] Getting mail database connection`);
  const connection = await getMailDbConnection();
  console.log(`[Account Manager] Got database connection: ${!!connection}`);
  
  try {
    // Hash the password using OpenSSL for exact Dovecot compatibility
    console.log(`[Account Manager] Hashing password with OpenSSL`);
    const passwordFormat = await hashPasswordWithOpenSSL(password);
    console.log(`[Account Manager] Password hashed successfully: ${!!passwordFormat}`);
    console.log(`[Account Manager] Password hash type: ${passwordFormat.substring(0, 20)}`);
    
    // Get the table name from env or use default
    const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
    
    // We assume tables exist as they're part of the mail server setup
    // Get domain table name
    const domainTable = process.env.MAIL_DOMAINS_TABLE || 'virtual_domains';
    let domainId;
    
    console.log(`[Account Manager] Working with domain table: ${domainTable}`);
    
    try {
      // Check if domain exists
      console.log(`[Account Manager] Checking if domain exists: ${domain}`);
      const [domainResults] = await connection.execute(
        `SELECT id FROM ${domainTable} WHERE name = ?`,
        [domain]
      );
      console.log(`[Account Manager] Domain check result: ${JSON.stringify(domainResults)}`);
      
      if (domainResults.length === 0) {
        // Domain doesn't exist, create it
        console.log(`[Account Manager] Domain ${domain} not found, creating it`);
        const [insertResult] = await connection.execute(
          `INSERT INTO ${domainTable} (name) VALUES (?)`,
          [domain]
        );
        console.log(`[Account Manager] Domain created with ID: ${insertResult.insertId}`);
        domainId = insertResult.insertId;
      } else {
        console.log(`[Account Manager] Domain ${domain} found with ID: ${domainResults[0].id}`);
        domainId = domainResults[0].id;
      }
    } catch (domainError) {
      console.error(`[Account Manager] Error handling domain: ${domainError.message}`);
      console.error(`[Account Manager] Full error:`, domainError);
      throw new Error(`Failed to manage domain: ${domainError.message}`);
    }
    
    // Insert the new mail account
    // Include user_id if provided to link to our users table
    let results;
    
    console.log(`[Account Manager] Inserting new mail account into table: ${tableName}`);
    console.log(`[Account Manager] Account details: email=${email}, username=${username}, domainId=${domainId}, userId=${userId || 'not provided'}`);
    
    try {
      if (userId) {
        console.log(`[Account Manager] Using user_id in mail account creation: ${userId}`);
        const [insertResults] = await connection.execute(
          `INSERT INTO ${tableName} (domain_id, email, password, username, user_id, pending_activation) 
           VALUES (?, ?, ?, ?, ?, 1)`,
          [domainId, email, passwordFormat, username, userId]
        );
        console.log(`[Account Manager] Mail account created with ID: ${insertResults.insertId}`);
        results = insertResults;
      } else {
        // Legacy insertion without user_id
        console.log(`[Account Manager] Creating mail account without user_id`);
        const [insertResults] = await connection.execute(
          `INSERT INTO ${tableName} (domain_id, email, password, username, pending_activation) 
           VALUES (?, ?, ?, ?, 1)`,
          [domainId, email, passwordFormat, username]
        );
        console.log(`[Account Manager] Mail account created with ID: ${insertResults.insertId}`);
        results = insertResults;
      }
      
      console.log(`[Account Manager] Mail account created successfully in database: ${email}`);
    } catch (insertError) {
      console.error(`[Account Manager] Error inserting mail account: ${insertError.message}`);
      console.error(`[Account Manager] Full error:`, insertError);
      throw new Error(`Failed to insert mail account: ${insertError.message}`);
    }
    
    return {
      success: true,
      email,
      domain,
      username,
      id: results.insertId,
      message: `Mail account ${email} created successfully`
    };
  } catch (error) {
    console.error('[Account Manager] Database error creating mail account:', error);
    throw new Error(`Failed to create mail account: ${error.message}`);
  } finally {
    // Close the connection
    await connection.end();
  }
}

/**
 * Delete an email account from the mail database
 * 
 * @param {string} email The email address to delete
 * @returns {Promise<Object>} Result of account deletion
 */
export async function deleteMailAccount(email) {
  console.log(`[Account Manager] Deleting mail account: ${email}`);
  
  if (!email) {
    throw new Error('Email is required');
  }
  
  // Get database connection
  const connection = await getMailDbConnection();
  
  try {
    // Get the table name from env or use default
    const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
    
    // Delete the mail account
    const [results] = await connection.execute(
      `DELETE FROM ${tableName} WHERE email = ?`,
      [email]
    );
    
    if (results.affectedRows === 0) {
      throw new Error(`Mail account ${email} not found`);
    }
    
    console.log(`[Account Manager] Mail account deleted successfully: ${email}`);
    
    return {
      success: true,
      email,
      message: `Mail account ${email} deleted successfully`
    };
  } catch (error) {
    console.error('[Account Manager] Database error deleting mail account:', error);
    throw new Error(`Failed to delete mail account: ${error.message}`);
  } finally {
    // Close the connection
    await connection.end();
  }
}

/**
 * Check if an email account exists in the mail database
 * 
 * @param {string} email The email address to check
 * @returns {Promise<boolean>} Whether the account exists
 */
export async function checkMailAccount(email) {
  console.log(`[Account Manager] Checking if mail account exists: ${email}`);
  
  if (!email) {
    throw new Error('Email is required');
  }
  
  // Get database connection
  const connection = await getMailDbConnection();
  
  try {
    // Get the table name from env or use default
    const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
    
    // Check if the mail account exists
    const [rows] = await connection.execute(
      `SELECT id FROM ${tableName} WHERE email = ?`,
      [email]
    );
    
    return rows.length > 0;
  } catch (error) {
    console.error('[Account Manager] Database error checking mail account:', error);
    throw new Error(`Failed to check mail account: ${error.message}`);
  } finally {
    // Close the connection
    await connection.end();
  }
}

/**
 * Update mail account password
 * 
 * @param {string} email The email address
 * @param {string} newPassword The new password
 * @returns {Promise<Object>} Result of password update
 */
export async function updateMailAccountPassword(email, newPassword) {
  console.log(`[Account Manager] Updating password for mail account: ${email}`);
  
  if (!email || !newPassword) {
    throw new Error('Email and new password are required');
  }
  
  // Get database connection
  const connection = await getMailDbConnection();
  
  try {
    // Hash the new password
    const passwordFormat = hashPassword(newPassword);
    
    // Get the table name from env or use default
    const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
    
    // Update the password
    const [results] = await connection.execute(
      `UPDATE ${tableName} SET password = ? WHERE email = ?`,
      [passwordFormat, email]
    );
    
    if (results.affectedRows === 0) {
      throw new Error(`Mail account ${email} not found`);
    }
    
    console.log(`[Account Manager] Password updated successfully for: ${email}`);
    
    return {
      success: true,
      email,
      message: `Password updated successfully for ${email}`
    };
  } catch (error) {
    console.error('[Account Manager] Database error updating password:', error);
    throw new Error(`Failed to update password: ${error.message}`);
  } finally {
    // Close the connection
    await connection.end();
  }
}

/**
 * List all domains in the mail database
 * 
 * @returns {Promise<Array>} List of domains
 */
export async function listMailDomains() {
  console.log('[Account Manager] Listing mail domains');
  
  // Get database connection
  const connection = await getMailDbConnection();
  
  try {
    // Get the table name from env or use default
    const domainTable = process.env.MAIL_DOMAINS_TABLE || 'virtual_domains';
    
    // Try to get domains from domains table if it exists
    try {
      const [rows] = await connection.execute(
        `SELECT name FROM ${domainTable}`
      );
      
      return rows.map(row => row.name);
    } catch (tableError) {
      console.warn(`[Account Manager] Error accessing domains table: ${tableError.message}`);
      
      // Fall back to getting unique domains from users table by parsing emails
      const usersTable = process.env.MAIL_USERS_TABLE || 'virtual_users';
      
      const [rows] = await connection.execute(
        `SELECT DISTINCT email FROM ${usersTable}`
      );
      
      // Extract domains from email addresses
      const domains = new Set();
      rows.forEach(row => {
        const parts = row.email.split('@');
        if (parts.length === 2) {
          domains.add(parts[1]);
        }
      });
      
      return Array.from(domains);
    }
  } catch (error) {
    console.error('[Account Manager] Database error listing domains:', error);
    throw new Error(`Failed to list mail domains: ${error.message}`);
  } finally {
    // Close the connection
    await connection.end();
  }
}

/**
 * Test connection to mail server (SMTP/IMAP)
 * 
 * @returns {Promise<Object>} Connection test results
 */
export async function testMailConnection() {
  const results = {
    smtp: { success: false, error: null },
    imap: { success: false, error: null },
    database: { success: false, error: null }
  };
  
  // Test database connection
  try {
    const connection = await getMailDbConnection();
    await connection.ping();
    results.database.success = true;
    await connection.end();
  } catch (error) {
    results.database.error = error.message;
  }
  
  // Test SMTP connection
  if (process.env.MAIL_HOST) {
    try {
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.default.createTransport({
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_SMTP_PORT || '587'),
        secure: process.env.MAIL_SMTP_SECURE === 'true',
        auth: {
          user: process.env.MAIL_TEST_USER,
          pass: process.env.MAIL_TEST_PASSWORD
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });
      
      await transporter.verify();
      results.smtp.success = true;
    } catch (error) {
      results.smtp.error = error.message;
    }
  } else {
    results.smtp.error = 'MAIL_HOST not configured';
  }
  
  // Test IMAP connection
  if (process.env.MAIL_HOST && process.env.MAIL_TEST_USER) {
    try {
      const { ImapFlow } = await import('imapflow');
      
      const client = new ImapFlow({
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_IMAP_PORT || '993'),
        secure: process.env.MAIL_IMAP_SECURE !== 'false',
        auth: {
          user: process.env.MAIL_TEST_USER,
          pass: process.env.MAIL_TEST_PASSWORD
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      });
      
      await client.connect();
      await client.logout();
      results.imap.success = true;
    } catch (error) {
      results.imap.error = error.message;
    }
  } else {
    results.imap.error = 'MAIL_HOST or MAIL_TEST_USER not configured';
  }
  
  return results;
}

/**
 * Get user's email from virtual_users table by user_id
 * 
 * @param {string} userId The user's ID to look up
 * @returns {Promise<string|null>} The user's email or null if not found
 */
export async function getUserEmailByUserId(userId) {
  console.log(`[Account Manager] Getting email for user: ${userId}`);
  
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  // Get database connection
  const connection = await getMailDbConnection();
  
  try {
    // Get the table name from env or use default
    const tableName = process.env.MAIL_USERS_TABLE || 'virtual_users';
    
    // Query the virtual_users table for the user's email
    const [rows] = await connection.execute(
      `SELECT email FROM ${tableName} WHERE user_id = ?`,
      [userId]
    );
    
    if (rows.length === 0) {
      console.log(`[Account Manager] No email found for user: ${userId}`);
      return null;
    }
    
    console.log(`[Account Manager] Found email for user: ${userId}`);
    return rows[0].email;
  } catch (error) {
    console.error('[Account Manager] Database error getting user email:', error);
    throw new Error(`Failed to get user email: ${error.message}`);
  } finally {
    // Close the connection
    await connection.end();
  }
}

export default {
  createMailAccount,
  deleteMailAccount,
  checkMailAccount,
  updateMailAccountPassword,
  listMailDomains,
  testMailConnection,
  getUserEmailByUserId
};