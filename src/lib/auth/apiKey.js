/**
 * API Key Authentication Module
 *
 * Utilities for verifying and managing API keys for agent authentication
 */

import db from '@/lib/db';

/**
 * Verify an API key and return the associated user
 *
 * @param {string} apiKey - The API key to verify
 * @returns {Promise<Object|null>} User object if valid, null otherwise
 */
export async function verifyApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return null;
  }

  try {
    const user = await db.users.findByApiKey(apiKey);

    if (!user) {
      return null;
    }

    // Optionally update last_used_at timestamp for tracking
    // (Could be done async to avoid blocking)
    updateLastUsed(user.id, apiKey).catch(err => {
      console.error('Failed to update API key last_used_at:', err);
    });

    return user;
  } catch (error) {
    console.error('Error verifying API key:', error);
    return null;
  }
}

/**
 * Update the last used timestamp for an API key
 * (Async, non-blocking)
 *
 * @param {string} userId - User ID
 * @param {string} apiKey - API key that was used
 */
async function updateLastUsed(userId, apiKey) {
  try {
    // Update the api_keys table if it exists
    await db.query(
      `UPDATE api_keys
       SET last_used_at = NOW()
       WHERE user_id = ? AND key_hash = SHA2(?, 256)`,
      [userId, apiKey]
    );
  } catch (error) {
    // Silently fail - this is just for analytics
    // The api_keys table might not exist in all environments
  }
}

/**
 * Validate API key format
 *
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if format is valid
 */
export function isValidApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // API keys should be at least 32 characters
  if (apiKey.length < 32) {
    return false;
  }

  // Check if it's alphanumeric with possible underscores/hyphens
  const validPattern = /^[A-Za-z0-9_-]+$/;
  return validPattern.test(apiKey);
}
