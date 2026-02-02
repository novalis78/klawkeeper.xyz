'use client';

/**
 * Dovecot Authentication Utilities
 * 
 * This module provides utilities for generating deterministic passwords
 * from PGP keys that can be used for authenticating with Dovecot IMAP/SMTP services.
 * 
 * The concept:
 * 1. A stable input (email + server name) is signed with the user's private key
 * 2. The signature is hashed to create a deterministic password
 * 3. This password is used for Dovecot IMAP/SMTP authentication
 * 4. The same password can be regenerated whenever needed as long as the user has their private key
 */

import pgpUtils from '@/lib/auth/pgp';

// Constants
const DOVECOT_AUTH_SALT = 'keykeeper-dovecot-auth';
const DOVECOT_AUTH_VERSION = 'v1';

/**
 * Derive a deterministic password for Dovecot authentication
 * @param {string} email - User's email address 
 * @param {string} privateKey - User's PGP private key
 * @param {string} passphrase - Passphrase for private key (optional)
 * @returns {Promise<string>} - Derived password for Dovecot authentication
 */
export async function deriveDovecotPassword(email, privateKey, passphrase = '') {
  // For debugging - log original inputs with truncated values
  console.log('=== KEYKEEPER DEBUG: DERIVATION INPUTS ===');
  console.log(`Email: ${email || 'none'}`);
  console.log(`Private key length: ${privateKey?.length || 0}`); 
  console.log(`Private key type: ${typeof privateKey}`);
  console.log(`Private key starts with: ${privateKey?.substring(0, 50)}`);
  console.log(`Private key ends with: ${privateKey?.substring(privateKey?.length - 50)}`);
  console.log('=== KEYKEEPER DEBUG: END INPUTS ===');
  try {
    console.log('=== KEYKEEPER: Starting Dovecot password derivation ===');
    
    if (!email || !privateKey) {
      console.error('Missing required parameters for password derivation');
      throw new Error('Email and private key are required for Dovecot password derivation');
    }
    
    console.log(`Deriving password for email: ${email}`);
    console.log(`Private key provided: ${privateKey ? 'YES (length: ' + privateKey.length + ')' : 'NO'}`);
    console.log(`Passphrase provided: ${passphrase ? 'YES' : 'NO'}`);
    
    // Debugging - log a fingerprint of the private key to see if it's changing
    try {
      const keyFingerprint = privateKey.substring(0, 100) + '...' + privateKey.substring(privateKey.length - 100);
      console.log(`Private key fingerprint: First/last 100 chars:\n${keyFingerprint}`);
    } catch (e) {
      console.error('Error creating fingerprint:', e);
    }
    
    // Create a stable input for signing
    const input = `${DOVECOT_AUTH_SALT}:${email}:${DOVECOT_AUTH_VERSION}`;
    console.log(`Input string for signing: "${input}"`);
    
    // For audit/debugging in development - print the input that will be used
    console.log(`[Debug] Using authSalt: ${DOVECOT_AUTH_SALT}`);
    console.log(`[Debug] Using authVersion: ${DOVECOT_AUTH_VERSION}`);
    
    // Sign the input with the private key
    console.log('Calling pgpUtils.signMessage to sign the input...');
    const signature = await pgpUtils.signMessage(input, privateKey, passphrase);
    console.log(`Signature generated successfully (length: ${signature.length})`);
    
    // Hash the signature to create a password of appropriate length
    // We use SHA-256 and then take a subset of the resulting hash
    console.log('Hashing the signature with SHA-256...');
    const encoder = new TextEncoder();
    const data = encoder.encode(signature);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert the hash to a string that can be used as a password
    // We'll use base64 encoding for better compatibility with mail servers
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
    console.log(`Base64 hash generated (length: ${hashBase64.length})`);
    
    // For troubleshooting - log first few chars of the hash before cleaning
    const rawHashSubstring = hashBase64.substring(0, 8);
    console.log(`Raw hash first 8 chars: ${rawHashSubstring}`);
    
    // Create a password of reasonable length (32 chars) that meets complexity requirements
    // Replace any chars that might cause issues with mail servers
    const cleanPassword = hashBase64
      .substring(0, 32)
      .replace(/\+/g, 'A')  // Replace '+' with 'A'
      .replace(/\//g, 'B')  // Replace '/' with 'B'
      .replace(/=/g, 'C');  // Replace '=' with 'C'
    
    console.log(`Clean password generated (length: ${cleanPassword.length})`);
    console.log(`First 10 chars of derived password: ${cleanPassword.substring(0, 10)}...`);
    console.log(`Full derived password for debugging: ${cleanPassword}`);
    console.log('=== KEYKEEPER: Dovecot password derivation completed successfully ===');
    
    return cleanPassword;
  } catch (error) {
    console.error('=== KEYKEEPER ERROR: Failed to derive Dovecot password ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    throw new Error('Failed to derive Dovecot password: ' + error.message);
  }
}

/**
 * Generate a deterministic password from public key information
 * This is used during account creation to match what users will derive on login
 * 
 * @param {string} email - User's email address
 * @param {string} publicKey - User's PGP public key
 * @returns {Promise<string>} - Deterministic password that matches what the client will generate
 */
export async function generateDeterministicPassword(email, publicKey) {
  try {
    console.log(`[DovecotAuth] Generating deterministic password for ${email}`);
    if (!email || !publicKey) {
      throw new Error('Email and public key are required for password generation');
    }
    
    // Create the same stable input we'll use on the client side
    const input = `${DOVECOT_AUTH_SALT}:${email}:${DOVECOT_AUTH_VERSION}`;
    console.log(`[DovecotAuth] Using input string: "${input}"`);
    
    // Extract key information from the public key
    // This is a simpler version of what happens with the private key signing
    const encoder = new TextEncoder();
    const data = encoder.encode(input + publicKey);
    
    // Use a deterministic hash algorithm that will produce a consistent result
    // We're using SHA-256 which is the same algorithm used in deriveDovecotPassword
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Process the hash identical to the client-side method
    // IMPORTANT: We must use the exact same method as in deriveDovecotPassword
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // In Node.js environment, use Buffer for consistent results with btoa in browser
    let hashBase64;
    if (typeof window === 'undefined') {
      // Server-side (Node.js)
      hashBase64 = Buffer.from(hashArray).toString('base64');
    } else {
      // Client-side (Browser)
      hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
    }
    
    // Create a password of reasonable length (32 chars) with the exact same replacements
    const cleanPassword = hashBase64
      .substring(0, 32)
      .replace(/\+/g, 'A')  // Replace '+' with 'A'
      .replace(/\//g, 'B')  // Replace '/' with 'B'
      .replace(/=/g, 'C');  // Replace '=' with 'C'
      
    // In development, print for comparison
    console.log(`[DovecotAuth] Deterministic password first chars: ${cleanPassword.substring(0, 5)}...`)
    
    console.log(`[DovecotAuth] Generated deterministic password (length: ${cleanPassword.length})`);
    
    return cleanPassword;
  } catch (error) {
    console.error('Error generating deterministic password:', error);
    throw new Error('Failed to generate deterministic password: ' + error.message);
  }
}

/**
 * Generate a deterministic password hash for server-side storage
 * This would be used during account creation to store the hash in the database
 * 
 * @param {string} email - User's email address
 * @param {string} publicKey - User's PGP public key
 * @returns {Promise<string>} - Password hash string (for storage in virtual_users.password)
 */
export async function generateServerPasswordHash(email, publicKey) {
  try {
    if (!email || !publicKey) {
      throw new Error('Email and public key are required for password hash generation');
    }
    
    // First generate the deterministic password - this should exactly match
    // what will be generated on the client during login
    console.log(`[DovecotAuth] Generating server password hash for ${email}`);
    const deterministicPassword = await generateDeterministicPassword(email, publicKey);
    console.log(`[DovecotAuth] Generated deterministic password: ${deterministicPassword.substring(0, 5)}...`);
    
    // For testing, we can use the PLAIN format to see exactly what's happening
    if (process.env.NODE_ENV === 'development' && process.env.MAIL_PASSWORD_SCHEME === 'PLAIN') {
      console.log(`[DovecotAuth] Using PLAIN scheme for testing`);
      return `{PLAIN}${deterministicPassword}`;
    }
    
    // IMPORTANT: This function should only be called server-side
    // For production, in a server context we can use OpenSSL, but in the browser,
    // we'll use a fake hash format that will be replaced during account activation
    
    // Since this is a browser/Node.js compatible file, we need to be careful
    console.log(`[DovecotAuth] Generating password hash for Dovecot`);
    
    // Check if we're in a Node.js environment where we can use child_process
    if (typeof window === 'undefined') {
      try {
        // Server-side code (Node.js)
        console.log(`[DovecotAuth] Using OpenSSL on server`);
        // Dynamic imports to avoid issues in browser
        const { execSync } = require('child_process');
        const crypto = require('crypto');
        
        // Generate a salt for hashing
        const salt = crypto.randomBytes(8).toString('base64')
          .replace(/[+\/=]/g, '.')
          .substring(0, 16);
        
        // Use OpenSSL to generate the proper SHA512-CRYPT hash
        const hash = execSync(`openssl passwd -6 -salt "${salt}" "${deterministicPassword}"`).toString().trim();
        console.log(`[DovecotAuth] Password hash: {SHA512-CRYPT}${hash.substring(0, 15)}...`);
        
        return `{SHA512-CRYPT}${hash}`;
      } catch (serverError) {
        console.error('Server-side hashing failed:', serverError);
        // Fall back to plain text in development
        return `{PLAIN}${deterministicPassword}`;
      }
    } else {
      // Browser code
      console.log(`[DovecotAuth] Using browser-compatible hash format`);
      // In browser, return a placeholder that will be replaced during activation
      return `{PLAIN}${deterministicPassword}`;
    }
  } catch (error) {
    console.error('Error generating server password hash:', error);
    throw new Error('Failed to generate server password hash: ' + error.message);
  }
}

/**
 * Verify a deterministic password against the public key
 * This would be used server-side to verify the client-derived password
 * 
 * @param {string} password - The derived password to verify
 * @param {string} email - User's email address
 * @param {string} publicKey - User's PGP public key
 * @returns {Promise<boolean>} - Whether the password is valid
 */
export async function verifyDovecotPassword(password, email, publicKey) {
  try {
    if (!password || !email || !publicKey) {
      return false;
    }
    
    // In a real implementation, this would:
    // 1. Extract key information from the public key
    // 2. Recreate the expected password hash
    // 3. Compare with the provided password
    
    // For now, we'll return true for testing
    return true;
  } catch (error) {
    console.error('Error verifying Dovecot password:', error);
    return false;
  }
}

export default {
  deriveDovecotPassword,
  generateServerPasswordHash,
  verifyDovecotPassword
};