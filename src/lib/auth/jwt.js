import { jwtVerify, SignJWT } from 'jose';

/**
 * JWT Authentication Utilities
 * 
 * This module provides utilities for JWT-based authentication in KeyKeeper.world,
 * including token generation, verification, and extraction.
 */

// Secret key for signing and verifying tokens
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development_secret_key_replace_in_production');

// Token expiration times (in seconds)
const expirationTimes = {
  access: 60 * 60, // 1 hour
  refresh: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Generate a JWT access token for a user
 * @param {Object} payload - Data to include in the token
 * @param {string} type - Token type (access or refresh)
 * @returns {Promise<string>} - Signed JWT
 */
export async function generateToken(payload, type = 'access') {
  const expiresIn = expirationTimes[type] || expirationTimes.access;
  
  return new SignJWT({ ...payload, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .setIssuer('keykeeper.world')
    .setAudience('keykeeper.world')
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'keykeeper.world',
      audience: 'keykeeper.world',
    });
    
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract token from Authorization header
 * @param {Object} req - Next.js request object
 * @returns {string|null} - JWT token or null if not found
 */
export function extractTokenFromHeader(req) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * Extract token from cookies
 * @param {Object} cookies - Next.js cookies object
 * @returns {string|null} - JWT token or null if not found
 */
export function extractTokenFromCookies(cookies) {
  return cookies.get('auth_token')?.value || null;
}

export default {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  extractTokenFromCookies,
};