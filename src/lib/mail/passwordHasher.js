/**
 * Dovecot Password Hasher
 * 
 * Utility functions for generating properly formatted Dovecot password hashes
 * from user's derived mail passwords.
 * 
 * See docs/HASH.md for more details on the implementation requirements.
 */

import crypto from 'crypto';

/**
 * Generates a Dovecot-compatible password hash in the proper format
 * 
 * @param {string} password - The plaintext password to hash
 * @param {string} [scheme='SHA512-CRYPT'] - The hash scheme to use
 * @returns {string} - Formatted password hash for Dovecot
 */
export function generateDovecotHash(password, scheme = 'SHA512-CRYPT') {
  if (!password) {
    throw new Error('Password is required for hashing');
  }
  
  // If environment variable is set, use that instead of default
  const hashMethod = process.env.MAIL_PASSWORD_SCHEME || scheme;
  
  switch (hashMethod) {
    case 'SHA512-CRYPT': {
      // Generate a random salt
      const salt = crypto.randomBytes(8).toString('base64')
        .replace(/[+\/=]/g, '.') // Replace characters not used in crypt salts
        .substring(0, 16);       // Trim to 16 chars max
      
      // For SHA512-CRYPT, we should use the crypt3 library, but as a fallback
      // we'll use the Node.js crypto module with a warning
      
      try {
        // Try to use crypt3 if available
        // This is dynamically imported to prevent build errors if not installed
        try {
          // Dynamic import to avoid build errors
          const crypt3 = require('crypt3');
          
          // Use crypt3 to generate a proper SHA512-CRYPT hash with the $6$ prefix
          const hash = crypt3(password, '$6$' + salt);
          
          // Format for Dovecot
          return `{SHA512-CRYPT}${hash}`;
        } catch (importError) {
          console.warn('crypt3 module not found, using fallback method for SHA512-CRYPT');
          
          // If crypt3 is not available, use a simplified version with a warning
          // Note: This is not a proper implementation of SHA512-CRYPT and may not work with Dovecot
          const hash = crypto.createHash('sha512')
            .update(salt + password)
            .digest('base64')
            .replace(/[+\/=]/g, '.');
          
          console.warn('WARNING: Simplified SHA512-CRYPT implementation used. This may not work with Dovecot!');
          console.warn('Install the crypt3 module for proper SHA512-CRYPT support');
          
          return `{SHA512-CRYPT}$6$${salt}$${hash}`;
        }
      } catch (error) {
        console.error('Error generating SHA512-CRYPT hash:', error);
        throw new Error('Failed to generate SHA512-CRYPT hash');
      }
    }
    
    case 'SSHA': {
      // SSHA = Salted SHA-1, used by some mail servers
      const salt = crypto.randomBytes(8);
      
      // Create SHA-1 hash of password + salt
      const hash = crypto.createHash('sha1')
        .update(Buffer.from(password, 'utf-8'))
        .update(salt)
        .digest();
      
      // Combine hash and salt, then base64 encode
      const combined = Buffer.concat([hash, salt]);
      const base64 = combined.toString('base64');
      
      return `{SSHA}${base64}`;
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
      // If all else fails, use PLAIN as a fallback for testing
      console.warn(`Unknown password scheme '${hashMethod}' requested, using PLAIN as fallback`);
      return `{PLAIN}${password}`;
    }
  }
}

/**
 * Verify a password against a stored hash
 * 
 * @param {string} password - The plaintext password to verify
 * @param {string} storedHash - The stored hash from the database
 * @returns {boolean} - Whether the password matches the hash
 */
export function verifyPassword(password, storedHash) {
  // Extract the scheme from the stored hash
  const match = storedHash.match(/^\{([A-Z0-9-]+)\}(.*)/);
  
  if (!match) {
    console.error('Invalid hash format. Expected format: {SCHEME}hash');
    return false;
  }
  
  const [, scheme, hash] = match;
  
  // Verify based on scheme
  switch (scheme) {
    case 'PLAIN':
      return password === hash;
      
    case 'MD5': {
      const calculatedHash = crypto.createHash('md5')
        .update(password)
        .digest('hex');
      return calculatedHash === hash;
    }
    
    case 'SHA512-CRYPT': {
      try {
        // Try to use crypt3 if available
        const crypt3 = require('crypt3');
        
        // Extract the salt from the hash (format: $6$salt$hash)
        const saltMatch = hash.match(/^\$6\$([^$]+)\$.*/);
        
        if (!saltMatch) {
          console.error('Invalid SHA512-CRYPT hash format. Expected: $6$salt$hash');
          return false;
        }
        
        const salt = saltMatch[1];
        const calculatedHash = crypt3(password, '$6$' + salt);
        
        return calculatedHash === hash;
      } catch (error) {
        console.error('Error verifying SHA512-CRYPT hash:', error);
        console.warn('crypt3 module not available, password verification may not work correctly');
        return false;
      }
    }
    
    case 'SSHA': {
      // SSHA format: base64(SHA1(password + salt) + salt)
      const decoded = Buffer.from(hash, 'base64');
      
      // Extract hash and salt
      const sha1Hash = decoded.slice(0, 20); // SHA-1 hash is 20 bytes
      const salt = decoded.slice(20);        // Rest is salt
      
      // Calculate hash with same salt
      const calculatedHash = crypto.createHash('sha1')
        .update(Buffer.from(password, 'utf-8'))
        .update(salt)
        .digest();
      
      // Compare calculated hash with stored hash
      return calculatedHash.equals(sha1Hash);
    }
    
    default:
      console.error(`Unsupported password scheme: ${scheme}`);
      return false;
  }
}

export default {
  generateDovecotHash,
  verifyPassword
};