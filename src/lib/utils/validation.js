/**
 * Validation utilities for KeyKeeper
 * 
 * This module provides utilities for validating user input and data.
 */

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - Whether email is valid
 */
export function isValidEmail(email) {
  if (!email) return false;
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate PGP public key format
 * @param {string} publicKey - PGP public key to validate
 * @returns {boolean} - Whether key is valid
 */
export function isValidPublicKey(publicKey) {
  if (!publicKey) return false;
  
  // Check for PGP public key header and footer
  const headerRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----/;
  const footerRegex = /-----END PGP PUBLIC KEY BLOCK-----/;
  
  return headerRegex.test(publicKey) && footerRegex.test(publicKey);
}

/**
 * Validate PGP private key format
 * @param {string} privateKey - PGP private key to validate
 * @returns {boolean} - Whether key is valid
 */
export function isValidPrivateKey(privateKey) {
  if (!privateKey) return false;
  
  // Check for PGP private key header and footer
  const headerRegex = /-----BEGIN PGP PRIVATE KEY BLOCK-----/;
  const footerRegex = /-----END PGP PRIVATE KEY BLOCK-----/;
  
  return headerRegex.test(privateKey) && footerRegex.test(privateKey);
}

/**
 * Validate PGP fingerprint format
 * @param {string} fingerprint - Fingerprint to validate
 * @returns {boolean} - Whether fingerprint is valid
 */
export function isValidFingerprint(fingerprint) {
  if (!fingerprint) return false;
  
  // PGP fingerprints are typically 40 hex characters, sometimes with spaces
  const cleanFingerprint = fingerprint.replace(/\s/g, '');
  const standardFingerprintRegex = /^[A-F0-9]{40}$/i;
  
  // For our development version, we'll accept our mock format as well
  const mockFingerprintRegex = /^[A-Z0-9]{8}$/;
  
  return standardFingerprintRegex.test(cleanFingerprint) || mockFingerprintRegex.test(fingerprint);
}

/**
 * Validate key ID format
 * @param {string} keyId - Key ID to validate
 * @returns {boolean} - Whether key ID is valid
 */
export function isValidKeyId(keyId) {
  if (!keyId) return false;
  
  // In production, PGP key IDs are typically 8 or 16 hex characters
  // For our development version, we'll accept our mock format as well
  const standardKeyIdRegex = /^[A-F0-9]{8}([A-F0-9]{8})?$/i;
  const mockKeyIdRegex = /^[a-zA-Z0-9]{8,16}$/;
  
  return standardKeyIdRegex.test(keyId) || mockKeyIdRegex.test(keyId);
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - Whether UUID is valid
 */
export function isValidUuid(uuid) {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(uuid);
}

/**
 * Validate PGP signature format
 * @param {string} signature - PGP signature to validate
 * @returns {boolean} - Whether signature is valid
 */
export function isValidSignature(signature) {
  if (!signature) return false;
  
  // Check for PGP signature header and footer
  const headerRegex = /-----BEGIN PGP SIGNATURE-----/;
  const footerRegex = /-----END PGP SIGNATURE-----/;
  
  return headerRegex.test(signature) && footerRegex.test(signature);
}

/**
 * Sanitize and validate disposable email address
 * @param {string} address - Email address to validate
 * @returns {string|false} - Sanitized address or false if invalid
 */
export function sanitizeAddress(address) {
  if (!address) return false;
  
  // Remove any whitespace and convert to lowercase
  const sanitized = address.trim().toLowerCase();
  
  // Basic email validation regex
  if (!isValidEmail(sanitized)) return false;
  
  // Check for domain restrictions (could be expanded for more security)
  if (sanitized.includes('@keykeeper.world')) {
    return sanitized;
  }
  
  return false;
}

/**
 * Sanitize and validate authentication method
 * @param {string} method - Authentication method to validate
 * @returns {string|false} - Sanitized method or false if invalid
 */
export function sanitizeAuthMethod(method) {
  if (!method) return false;
  
  const allowedMethods = ['browser', 'password_manager', 'hardware_key'];
  const sanitized = method.trim().toLowerCase();
  
  return allowedMethods.includes(sanitized) ? sanitized : false;
}

export default {
  isValidEmail,
  isValidPublicKey,
  isValidPrivateKey,
  isValidFingerprint,
  isValidKeyId,
  isValidUuid,
  isValidSignature,
  sanitizeAddress,
  sanitizeAuthMethod
};