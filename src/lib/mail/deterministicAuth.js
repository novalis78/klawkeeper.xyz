'use client';

/**
 * Deterministic Authentication Utilities
 * 
 * This module provides a truly deterministic way to derive passwords
 * from private keys, without using PGP signatures (which contain non-deterministic elements).
 * 
 * Instead, it uses HMAC-SHA256 with the private key material and a consistent input.
 */

// Constants for the derivation process
const AUTH_SALT = 'keykeeper-deterministic-auth';
const AUTH_VERSION = 'v1';

/**
 * Derives a deterministic password from a private key using HMAC-SHA256
 * 
 * @param {string} email - User's email address
 * @param {string} privateKey - User's PGP private key armored text
 * @returns {Promise<string>} - A deterministic password
 */
export async function deriveDeterministicPassword(email, privateKey) {
  try {
    console.log('=== KEYKEEPER: Starting deterministic password derivation ===');
    
    if (!email || !privateKey) {
      throw new Error('Email and private key are required for password derivation');
    }
    
    // Create a stable input string
    const input = `${AUTH_SALT}:${email}:${AUTH_VERSION}`;
    console.log(`Input string: "${input}"`);
    
    // Create a consistent hash of the private key
    // This avoids using any variable parts of PGP signatures
    const privateKeyHash = await hashText(privateKey);
    console.log(`Private key hash: ${privateKeyHash.substring(0, 10)}...`);
    
    // Use HMAC-SHA256 with the private key hash as the key and input as the message
    const hmacKey = await importKey(privateKeyHash);
    const hmacResult = await signWithHmac(input, hmacKey);
    
    // Convert to base64 for better compatibility
    const resultBase64 = arrayBufferToBase64(hmacResult);
    console.log(`HMAC result (base64): ${resultBase64.substring(0, 10)}...`);
    
    // Create a password of reasonable length that meets complexity requirements
    // Replace any chars that might cause issues with mail servers
    const password = resultBase64
      .substring(0, 32)
      .replace(/\+/g, 'A')  // Replace '+' with 'A'
      .replace(/\//g, 'B')  // Replace '/' with 'B'
      .replace(/=/g, 'C');  // Replace '=' with 'C'
    
    console.log(`Generated password: ${password.substring(0, 10)}...`);
    console.log(`Full password for debugging: ${password}`);
    console.log('=== KEYKEEPER: Password derivation completed successfully ===');
    
    return password;
  } catch (error) {
    console.error('=== KEYKEEPER ERROR: Failed to derive deterministic password ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    throw new Error('Failed to derive deterministic password: ' + error.message);
  }
}

/**
 * Helper function to hash text with SHA-256
 */
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Helper function to convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Helper function to convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const binString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

/**
 * Import a key for use with HMAC-SHA256
 */
async function importKey(keyMaterial) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

/**
 * Sign data with HMAC-SHA256
 */
async function signWithHmac(message, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  return await crypto.subtle.sign(
    'HMAC',
    key,
    data
  );
}

export default {
  deriveDeterministicPassword
};